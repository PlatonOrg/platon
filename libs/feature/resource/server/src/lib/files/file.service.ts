import { Injectable, NotFoundException } from '@nestjs/common'
import { BadRequestResponse, NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import {
  ACTIVITY_MAIN_FILE,
  EXERCISE_MAIN_FILE,
  PLCompiler,
  PLReferenceResolver,
  PLSourceFile,
  TEMPLATE_OVERRIDE_FILE,
  Variables,
} from '@platon/feature/compiler'
import { FileTypes, LATEST, ResourceFile, ResourcePermissions } from '@platon/feature/resource/common'
import path from 'path'
import { ResourcePermissionService } from '../permissions/permissions.service'
import { ResourceEntity } from '../resource.entity'
import { ResourceService } from '../resource.service'
import { Repo } from './repo'
import { README_PLE } from './snippets'
import { ResourceDependencyService } from '../dependency'

interface CompileInput {
  resourceId: string
  version?: string
  overrides?: Variables
  req?: IRequest
  withAst?: boolean
}

interface CompileOutput {
  source: PLSourceFile
  compiler: PLCompiler
  resource: ResourceEntity
}

interface RepoInfo {
  repo: Repo
  resource: ResourceEntity
  permissions: ResourcePermissions
}

@Injectable()
export class ResourceFileService {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly permissionService: ResourcePermissionService,
    private readonly dependencyService: ResourceDependencyService
  ) {}

  /**
   * Gets resource git repository.
   * @param identifier Resource entity|id|code
   * @param req Ongoing request for identifying user during git operations (optional)
   */
  async repo(
    identifier: string | ResourceEntity,
    req?: IRequest,
    defaultFiles?: Record<string, string>
  ): Promise<RepoInfo> {
    const resource =
      typeof identifier === 'string'
        ? (await this.resourceService.findByIdOrCode(identifier)).orElseThrow(
            () => new NotFoundResponse(`Resource not found: ${identifier}`)
          )
        : identifier

    const user = req?.user
    const permissions = await this.permissionService.userPermissionsOnResource({ resource, req })

    const directory = {
      CIRCLE: 'circles',
      ACTIVITY: 'activites',
      EXERCISE: 'exercises',
    }[resource.type]

    // const extendsExpr = (resourceId: string, resourceVersion: string) =>
    //   `@extends /${resourceId}:${resourceVersion}/${EXERCISE_MAIN_FILE}`

    return {
      repo: await Repo.get(path.join(directory, resource.id), {
        create: true,
        type: resource.type,
        user: user
          ? {
              name: user.username,
              email: user.email,
            }
          : undefined,
        defaultFiles: resource.templateId
          ? {
              [EXERCISE_MAIN_FILE]: '', // extendsExpr(resource.templateId, resource.templateVersion || LATEST),
              [TEMPLATE_OVERRIDE_FILE]: '{}',
              'readme.md': README_PLE,
            }
          : defaultFiles,
        parentCircle: resource.parentId,
        userCircle: user ? (await this.resourceService.getPersonal(user)).id : undefined,
      }),
      resource,
      permissions,
    }
  }

  async getFileContent(resourceId: string, path: string, version?: string, req?: IRequest): Promise<Uint8Array> {
    const { repo } = await this.repo(resourceId, req)
    const [, content] = await repo.read(path, version || LATEST)
    return content!
  }

  async compile(input: CompileInput): Promise<CompileOutput> {
    const { resourceId, version, req, overrides } = input
    const { repo, resource } = await this.repo(resourceId, req)
    if (resource.type === 'CIRCLE') {
      throw new BadRequestResponse(`Compiler: cannot compile circle`)
    }

    const main = {
      EXERCISE: EXERCISE_MAIN_FILE,
      ACTIVITY: ACTIVITY_MAIN_FILE,
    }[resource.type]

    const openedRepos: Record<string, Repo> = {}
    openedRepos[`${resource}-${version}`] = repo

    const [file, buffer] = await repo.read(main, version)
    if (!buffer) {
      throw new NotFoundException(`Compiler: missing main file in resource: ${resource.id}`)
    }

    const getRepo = async (resourceId: string, version?: string) => {
      version = version || LATEST
      const repo = openedRepos[`${resourceId}-${version}`]
      if (repo) {
        return repo
      }

      const { repo: newOpen } = await this.repo(resourceId, req)
      openedRepos[`${resourceId}-${version}`] = newOpen
      return newOpen
    }

    const resolver: PLReferenceResolver = {
      exists: async (resource, version, path) => {
        const repo = await getRepo(resource, version)
        return repo.exists(path)
      },
      resolveUrl: async (resource, version, path) => {
        const repo = await getRepo(resource, version)
        const [file] = await repo.read(path, version || LATEST)
        return file.downloadUrl
      },
      isDir: async (resource, version, path) => {
        const repo = await getRepo(resource, version)
        const [node] = await repo.read(path, version || LATEST)
        return node.type === FileTypes.folder
      },
      listDir: async (resource, version, path) => {
        const repo = await getRepo(resource, version)
        const [node] = await repo.read(path, version || LATEST)
        if (node.type !== FileTypes.folder) {
          throw new NotFoundResponse(`Compiler: cannot list dir for ${path} in ${resource}`)
        }
        const files: ResourceFile[] = []
        function addFilesRecursive(node: ResourceFile): void {
          if (node.type === FileTypes.folder) {
            node.children?.forEach((child) => addFilesRecursive(child))
          } else {
            files.push(node)
          }
        }
        addFilesRecursive(node)
        return files.map((file) => file.path)
      },
      resolveContent: async (resource, version, path) => {
        const repo = await getRepo(resource, version)
        const [node, content] = await repo.read(path, version || LATEST)
        if (node.type !== FileTypes.file) {
          throw new NotFoundResponse(`Compiler: cannot resolve content for ${path} in ${resource}`)
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return Buffer.from((await content!).buffer).toString()
      },
    }

    const dependencyResolver = async (resourceId: string, version: string): Promise<string> => {
      let extendsLine = ''
      const resource = (await this.resourceService.findByIdOrCode(resourceId)).orElseThrow(
        () => new NotFoundResponse(`Resource not found: ${resourceId}`)
      )
      if (resource.templateId) {
        const dependency = await this.dependencyService.getTemplateDependency(resource.id, version || LATEST)
        if (!dependency) {
          throw new NotFoundResponse(`Dependency not found for resource: ${resourceId} at version: ${version}`)
        }
        extendsLine = `@extends /${dependency.dependOnId}:${dependency.dependOnVersion || LATEST}/${EXERCISE_MAIN_FILE}`
      }
      return extendsLine
    }

    const compiler = new PLCompiler({
      resolver,
      resource: resourceId,
      version: file.version,
      main: file.path,
      withAst: input.withAst,
      dependencyResolver: dependencyResolver,
    })
    await compiler.compile(Buffer.from((await buffer).buffer).toString())

    const source = await compiler.output(overrides)

    source.variables.author = resource.ownerId
    return { source, resource, compiler }
  }

  async getTitle(resourceId: string): Promise<string> {
    return this.resourceService.findByIdOrCode(resourceId).then((resource) => resource.orUndefined()?.name || 'À faire')
  }
}

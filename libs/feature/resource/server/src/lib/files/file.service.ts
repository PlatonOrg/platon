import { Injectable, NotFoundException } from '@nestjs/common'
import { BadRequestResponse, NotFoundResponse, User } from '@platon/core/common'
import {
  ACTIVITY_MAIN_FILE,
  EXERCISE_MAIN_FILE,
  PLCompiler,
  PLReferenceResolver,
  PLSourceFile,
  TEMPLATE_OVERRIDE_FILE,
  Variables,
} from '@platon/feature/compiler'
import { LATEST, ResourcePermissions } from '@platon/feature/resource/common'
import path from 'path'
import { ResourcePermissionService } from '../permissions/permissions.service'
import { ResourceEntity } from '../resource.entity'
import { ResourceService } from '../resource.service'
import { Repo } from './repo'
import { README_PLE } from './snippets'

interface CompileInput {
  resourceId: string
  version?: string
  overrides?: Variables
  user?: User
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
    private readonly permissionService: ResourcePermissionService
  ) {}

  /**
   * Gets resource git repository.
   * @param identifier Resource entity|id|code
   * @param user User that manipulates the repository (used for git commits)
   */
  async repo(identifier: string | ResourceEntity, user?: User): Promise<RepoInfo> {
    const resource =
      typeof identifier === 'string'
        ? (await this.resourceService.findByIdOrCode(identifier)).orElseThrow(
            () => new NotFoundResponse(`Resource not found: ${identifier}`)
          )
        : identifier

    const permissions = await this.permissionService.userPermissionsOnResource({ resource, user })

    const directory = {
      CIRCLE: 'circles',
      ACTIVITY: 'activites',
      EXERCISE: 'exercises',
    }[resource.type]

    const extendsExpr = (resourceId: string, resourceVersion: string) =>
      `@extends /${resourceId}:${resourceVersion}/${EXERCISE_MAIN_FILE}`

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
              [EXERCISE_MAIN_FILE]: extendsExpr(resource.templateId, resource.templateVersion || LATEST),
              [TEMPLATE_OVERRIDE_FILE]: '{}',
              'readme.md': README_PLE,
            }
          : undefined,
      }),
      resource,
      permissions,
    }
  }

  async compile(input: CompileInput): Promise<CompileOutput> {
    const { resourceId, version, user, overrides } = input
    const { repo, resource } = await this.repo(resourceId, user)
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

      const { repo: newOpen } = await this.repo(resourceId, user)
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
      resolveContent: async (resource, version, path) => {
        const repo = await getRepo(resource, version)
        const [, content] = await repo.read(path, version || LATEST)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return Buffer.from((await content!).buffer).toString()
      },
    }

    const compiler = new PLCompiler({
      resolver,
      resource: resourceId,
      version: file.version,
      main: file.path,
      withAst: input.withAst,
    })

    await compiler.compile(Buffer.from((await buffer).buffer).toString())

    const source = await compiler.output(overrides)
    source.variables.author = resource.ownerId
    return { source, resource, compiler }
  }
}

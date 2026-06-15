import { ExpandContext, Expandable, Expander } from '@cisstech/nestjs-expand'
import { Injectable, Logger } from '@nestjs/common'
import { IRequest, Mapper } from '@platon/core/server'
import { ResourceMeta } from '@platon/feature/resource/common'
import { ResourceMetaEntity, ResourceMetadataService } from './metadata'
import { ResourcePermissionsDTO } from './permissions'
import { ResourcePermissionService } from './permissions/permissions.service'
import { ResourceDTO } from './resource.dto'
import { ResourceService } from './resource.service'

@Injectable()
@Expander(ResourceDTO)
export class ResourceExpander {
  private readonly logger = new Logger(ResourceExpander.name)

  constructor(
    private readonly resourceService: ResourceService,
    private readonly metadataService: ResourceMetadataService,
    private readonly permissionService: ResourcePermissionService
  ) {}

  async metadata(context: ExpandContext<IRequest, ResourceDTO>): Promise<ResourceMeta | undefined> {
    const { parent, request } = context
    if (parent.type === 'CIRCLE') {
      return undefined
    }

    type MetaBatchLoader = {
      ids: string[]
      promise: Promise<Map<string, ResourceMetaEntity>>
      schedule: () => void
    }

    const loader = await request.memoize<MetaBatchLoader>('metadata.batch.loader', async () => {
      const ids: string[] = []
      let timeout: ReturnType<typeof setTimeout>
      let resolvePromise: (m: Map<string, ResourceMetaEntity>) => void
      const promise = new Promise<Map<string, ResourceMetaEntity>>((resolve) => (resolvePromise = resolve))
      const schedule = () => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
          try {
            resolvePromise(await this.metadataService.findByIds(ids))
          } catch (error) {
            this.logger.error('Failed to load resource metadata batch', { error, ids })
            resolvePromise(new Map<string, ResourceMetaEntity>())
          }
        }, 1)
      }
      return { ids, promise, schedule }
    })

    loader.ids.push(parent.id)
    loader.schedule()

    const result = await loader.promise
    return result.get(parent.id)?.meta
  }

  @Expandable(ResourceDTO)
  async template(context: ExpandContext<IRequest, ResourceDTO>): Promise<ResourceDTO | undefined> {
    const { parent, request } = context
    if (!parent.templateId) {
      return undefined
    }
    return this.resolveResourceId(request, parent.templateId)
  }

  @Expandable(ResourceDTO)
  async parent(context: ExpandContext<IRequest, ResourceDTO>): Promise<ResourceDTO | undefined> {
    const { parent, request } = context
    if (!parent.parentId) {
      return undefined
    }
    return this.resolveResourceId(request, parent.parentId)
  }

  async permissions(context: ExpandContext<IRequest, ResourceDTO>): Promise<ResourcePermissionsDTO> {
    const { parent, request } = context
    const permissions = await this.permissionService.userPermissionsOnResource({ req: request, resource: parent })
    return Mapper.map(permissions, ResourcePermissionsDTO)
  }

  private async resolveResourceId(req: IRequest, resourceId: string): Promise<ResourceDTO | undefined> {
    const resource = (await this.resourceService.findByIdOrCode(resourceId)).get()
    if (resource) {
      const permissions = await this.permissionService.userPermissionsOnResource({ req, resource })
      Object.assign(resource, { permissions })
      return Mapper.map(resource, ResourceDTO)
    }
    return undefined
  }
}

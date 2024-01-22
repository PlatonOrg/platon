import { ExpandContext, Expandable, Expander } from '@cisstech/nestjs-expand'
import { Injectable } from '@nestjs/common'
import { IRequest, Mapper } from '@platon/core/server'
import { ResourceMeta } from '@platon/feature/resource/common'
import { ResourceMetadataService } from './metadata'
import { ResourcePermissionService } from './permissions/permissions.service'
import { ResourceDTO } from './resource.dto'
import { ResourceService } from './resource.service'

@Injectable()
@Expander(ResourceDTO)
export class ResourceExpander {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly metadataService: ResourceMetadataService,
    private readonly permissionService: ResourcePermissionService
  ) {}

  async metadata(context: ExpandContext<IRequest, ResourceDTO>): Promise<ResourceMeta | undefined> {
    const { parent } = context
    if (parent.type === 'CIRCLE') {
      return undefined
    }

    const metadata = await this.metadataService.of(parent.id)
    return metadata.meta
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

  private async resolveResourceId(request: IRequest, resourceId: string): Promise<ResourceDTO | undefined> {
    const resource = (await this.resourceService.findById(resourceId)).get()
    if (resource) {
      const permissions = await this.permissionService.userPermissionsOnResource({
        resource,
        user: request.user,
      })
      Object.assign(resource, { permissions })
      return Mapper.map(resource, ResourceDTO)
    }
    return undefined
  }
}

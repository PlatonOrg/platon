import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { CreatedResponse, ForbiddenResponse, ItemResponse, ListResponse, NotFoundResponse } from '@platon/core/common'
import { IRequest, Mapper } from '@platon/core/server'
import { ResourceCompletionDTO } from './completion'
import { CircleTreeDTO, CreateResourceDTO, ResourceDTO, ResourceFiltersDTO, UpdateResourceDTO } from './resource.dto'
import { ResourceService } from './resource.service'
import { ResourceStatisticDTO } from './statistics'
import { ResourceViewService } from './views/view.service'
import { ResourcePermissionService } from './permissions/permissions.service'

@Controller('resources')
export class ResourceController {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly permissionService: ResourcePermissionService,
    private readonly resourceViewService: ResourceViewService
  ) {}

  @Get()
  async search(@Req() req: IRequest, @Query() filters: ResourceFiltersDTO = {}): Promise<ListResponse<ResourceDTO>> {
    let resources: ResourceDTO[] = []
    let total = 0
    if (filters.views) {
      const response = await this.resourceViewService.findAll(req.user.id)
      resources = Mapper.mapAll(
        response[0].map((r) => r.resource),
        ResourceDTO
      )
      total = response[1]
    } else {
      const response = await this.resourceService.search(filters)
      resources = Mapper.mapAll(response[0], ResourceDTO)
      total = response[1]
    }

    const resourceWithPermissions = await this.permissionService.userPermissionsOnResources(resources, req.user)
    return new ListResponse({
      total,
      resources: resourceWithPermissions
        .filter((e) => e.permissions.read)
        .map((e) => {
          Object.assign(e.resource, { permissions: e.permissions })
          return e.resource
        }),
    })
  }

  @Get('/tree')
  async tree(@Req() req: IRequest): Promise<ItemResponse<CircleTreeDTO>> {
    const [circles] = await this.resourceService.search({
      types: ['CIRCLE'],
    })
    const permissions = await this.permissionService.userPermissionsOnResources(circles, req.user)

    const tree = Mapper.map(await this.resourceService.tree(circles), CircleTreeDTO)

    const injectPermissions = (tree: CircleTreeDTO) => {
      Object.assign(tree, { permissions: permissions.find((p) => p.resource.id === tree.id)?.permissions })
      tree.children?.forEach((child) => injectPermissions(child))
    }

    injectPermissions(tree)

    return new ItemResponse({
      resource: tree,
    })
  }

  @Get('/completion')
  async completion(): Promise<ItemResponse<ResourceCompletionDTO>> {
    return new ItemResponse({
      resource: Mapper.map(await this.resourceService.completion(), ResourceCompletionDTO),
    })
  }

  @Get('/:id')
  async find(
    @Req() req: IRequest,
    @Param('id') id: string,
    @Query('markAsViewed') markAsViewed?: string
  ): Promise<ItemResponse<ResourceDTO>> {
    const optional = await this.resourceService.findById(id)
    const resource = Mapper.map(
      optional.orElseThrow(() => new NotFoundResponse(`Resource not found: ${id}`)),
      ResourceDTO
    )

    if (markAsViewed) {
      this.resourceViewService.create({
        resourceId: id,
        userId: req.user.id,
      })
    }

    const permissions = await this.permissionService.userPermissionsOnResource({
      resource,
      user: req.user,
    })
    if (!permissions.read) {
      throw new ForbiddenResponse(`Operation not allowed on resource: ${id}`)
    }

    Object.assign(resource, { permissions })
    return new ItemResponse({ resource })
  }

  @Get('/:id/statistic')
  async statistic(@Param('id') id: string): Promise<ItemResponse<ResourceStatisticDTO>> {
    return new ItemResponse({
      resource: Mapper.map(await this.resourceService.statistic(id), ResourceStatisticDTO),
    })
  }

  @Post()
  async create(@Req() req: IRequest, @Body() input: CreateResourceDTO): Promise<CreatedResponse<ResourceDTO>> {
    const parent = await this.resourceService.findById(input.parentId)
    if (!parent.isPresent()) {
      throw new NotFoundResponse(`Resource not found: ${input.parentId}`)
    }

    const permissions = await this.permissionService.userPermissionsOnResource({
      resource: parent.get(),
      user: req.user,
    })
    if (!permissions.write) {
      throw new ForbiddenResponse(`Operation not allowed on resource: ${input.parentId}`)
    }

    const resource = Mapper.map(
      await this.resourceService.create({
        ...(await this.resourceService.fromInput(input)),
        ownerId: req.user.id,
      }),
      ResourceDTO
    )

    Object.assign(resource, { permissions })

    return new CreatedResponse({ resource })
  }

  @Patch('/:id')
  async update(
    @Req() req: IRequest,
    @Param('id') id: string,
    @Body() input: UpdateResourceDTO
  ): Promise<ItemResponse<ResourceDTO>> {
    const existing = await this.resourceService.findById(id)
    if (!existing.isPresent()) {
      throw new NotFoundResponse(`Resource not found: ${id}`)
    }

    const permissions = await this.permissionService.userPermissionsOnResource({
      resource: existing.get(),
      user: req.user,
    })
    if (!permissions.write) {
      throw new ForbiddenResponse(`Operation not allowed on resource: ${id}`)
    }

    const resource = Mapper.map(
      await this.resourceService.update(existing.get(), await this.resourceService.fromInput(input)),
      ResourceDTO
    )

    Object.assign(resource, { permissions })

    return new ItemResponse({ resource })
  }
}

import { Controller, Delete, Get, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ItemResponse, ListResponse, NoContentResponse, NotFoundResponse } from '@platon/core/common'
import { IRequest, Mapper, UserDTO } from '@platon/core/server'
import { ResourceWatcherFiltersDTO } from './watcher.dto'
import { ResourceWatcherService } from './watcher.service'

@Controller('resources/:resourceId/watchers')
@ApiTags('Resources')
export class ResourceWatcherController {
  constructor(private readonly service: ResourceWatcherService) {}

  @Get()
  async search(
    @Param('resourceId') resourceId: string,
    @Query() filters: ResourceWatcherFiltersDTO = {}
  ): Promise<ListResponse<UserDTO>> {
    const [items, total] = await this.service.search(resourceId, filters)
    const resources = Mapper.mapAll(
      items.map((e) => e.user),
      UserDTO
    )
    return new ListResponse({ total, resources })
  }

  @Get('/:userId')
  async find(@Param('resourceId') resourceId: string, @Param('userId') userId: string): Promise<ItemResponse<UserDTO>> {
    const optional = await this.service.findByUserId(resourceId, userId)
    const resource = Mapper.map(
      optional.orElseThrow(() => new NotFoundResponse(`ResourceWatcher not found: ${userId}`)).user,
      UserDTO
    )
    return new ItemResponse({ resource })
  }

  @Post()
  async create(@Req() req: IRequest, @Param('resourceId') resourceId: string): Promise<ItemResponse<UserDTO>> {
    const resource = Mapper.map(await this.service.create({ userId: req.user.id, resourceId }), UserDTO)
    return new ItemResponse({ resource })
  }

  @Delete('/:userId')
  async delete(
    @Req() req: IRequest,
    @Param('userId') userId: string,
    @Param('resourceId') resourceId: string
  ): Promise<NoContentResponse> {
    if (userId !== req.user.id) {
      throw new UnauthorizedException("You cannot access other users' info")
    }

    await this.service.deleteByUserId(resourceId, userId)
    return new NoContentResponse()
  }
}

import { Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CreatedResponse, ItemResponse, ListResponse, NoContentResponse } from '@platon/core/common'
import { Roles, UUIDParam } from '@platon/core/server'
import { LtiToolConfig } from '@platon/feature/lti/common'
import { IsOptional, IsString } from 'class-validator'
import { CreateLtiPlatformDTO, LtiPlatformDTO, UpdateLtiPlatformDTO } from './lti-platform.dto'
import { LtiPlatformService } from './lti-platform.service'

class LtiPlatformFiltersDTO {
  @IsString()
  @IsOptional()
  readonly search?: string
}

@ApiBearerAuth()
@Roles('admin')
@Controller('lti/platforms')
@ApiTags('LTI')
export class LtiPlatformController {
  constructor(private readonly service: LtiPlatformService) {}

  @Get()
  async search(@Query() filters: LtiPlatformFiltersDTO): Promise<ListResponse<LtiPlatformDTO>> {
    const [platforms, total] = await this.service.search(filters.search)
    return new ListResponse({ total, resources: platforms.map(LtiPlatformDTO.fromEntity) })
  }

  @Get('/config')
  config(): ItemResponse<LtiToolConfig> {
    return new ItemResponse({ resource: this.service.getToolConfig() })
  }

  @Get('/:id')
  async find(@UUIDParam('id') id: string): Promise<ItemResponse<LtiPlatformDTO>> {
    return new ItemResponse({ resource: LtiPlatformDTO.fromEntity(await this.service.findById(id)) })
  }

  @Post()
  async create(@Body() input: CreateLtiPlatformDTO): Promise<CreatedResponse<LtiPlatformDTO>> {
    return new CreatedResponse({ resource: LtiPlatformDTO.fromEntity(await this.service.create(input)) })
  }

  @Patch('/:id')
  async update(
    @UUIDParam('id') id: string,
    @Body() input: UpdateLtiPlatformDTO
  ): Promise<ItemResponse<LtiPlatformDTO>> {
    return new ItemResponse({ resource: LtiPlatformDTO.fromEntity(await this.service.update(id, input)) })
  }

  @Delete('/:id')
  async delete(@UUIDParam('id') id: string): Promise<NoContentResponse> {
    await this.service.delete(id)
    return new NoContentResponse()
  }
}

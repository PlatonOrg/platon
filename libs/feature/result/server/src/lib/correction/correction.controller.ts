import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ForbiddenResponse, ItemResponse, ListResponse, UserRoles } from '@platon/core/common'
import { IRequest, Mapper, Roles, UUIDParam } from '@platon/core/server'
import {
  ActivityCorrection,
  ActivityCorrectionSummary,
  CorrectionStatus,
  UpsertCorrection,
} from '@platon/feature/result/common'
import { ActivityCorrectionDTO, ActivityCorrectionSummaryDTO, CorrectionDTO } from './correction.dto'
import { CorrectionService } from './correction.service'
import { CorrectionLabelService } from '../label/correction-label/correction-label.service'

@ApiBearerAuth()
@Controller('results/corrections')
@ApiTags('Results')
export class CorrectionController {
  constructor(
    private readonly service: CorrectionService,
    private readonly correctionLabelService: CorrectionLabelService
  ) {}

  @Get()
  async list(
    @Req() req: IRequest,
    @Query('status') status?: CorrectionStatus
  ): Promise<ListResponse<ActivityCorrection>> {
    const items = await this.service.list(req.user.id, undefined, false, status)
    const resources = Mapper.mapAll(items, ActivityCorrectionDTO)
    return new ListResponse({ total: resources.length, resources })
  }

  @Get('/summary')
  async listSummary(
    @Req() req: IRequest,
    @Query('status') status?: CorrectionStatus
  ): Promise<ListResponse<ActivityCorrectionSummary>> {
    const items = await this.service.listSummary(req.user.id, status)
    const resources = Mapper.mapAll(items, ActivityCorrectionSummaryDTO)
    return new ListResponse({ total: resources.length, resources })
  }

  @Get('/:activityId')
  async find(
    @Req() req: IRequest,
    @UUIDParam('activityId') activityId: string,
    @Query('viewer') viewer?: string
  ): Promise<ListResponse<ActivityCorrection>> {
    const viewerMode = viewer === 'true'
    if (viewerMode && ![UserRoles.teacher, UserRoles.admin].includes(req.user.role)) {
      throw new ForbiddenResponse('You are not allowed to access viewer mode for corrections')
    }
    const items = await this.service.list(req.user.id, activityId, viewerMode)
    const resources = Mapper.mapAll(items, ActivityCorrectionDTO)
    return new ListResponse({ total: resources.length, resources })
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post('/:sessionId')
  async upsert(
    @Req() req: IRequest,
    @UUIDParam('sessionId') sessionId: string,
    @Body() input: UpsertCorrection
  ): Promise<ItemResponse<CorrectionDTO>> {
    const response = new ItemResponse({
      resource: await this.service.upsert(sessionId, {
        ...input,
        authorId: req.user.id,
      }),
    })

    if (input.labels) {
      for (const label of input.labels) {
        await this.correctionLabelService.labelize(sessionId, label.answerId, label.labelId, response.resource.id)
      }
    }
    return response
  }
}

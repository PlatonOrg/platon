import { Controller, Get, Patch, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ErrorResponse, ListResponse, UserRoles } from '@platon/core/common'
import { IRequest, Mapper, Roles } from '@platon/core/server'
import { CorrectionLabel, CreateLabel } from '@platon/feature/result/common'
import { LabelService } from './label.service'
import { LabelDTO } from './label.dto'
import { CorrectionLabelService } from './correction-label/correction-label.service'

@ApiBearerAuth()
@Controller('results/labels')
@ApiTags('Results')
export class LabelController {
  constructor(
    private readonly labelService: LabelService,
    private readonly correctionLabelService: CorrectionLabelService
  ) {}

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('labelize')
  async labelize(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const labelCorrectionEntities = await this.correctionLabelService.labelize(
      req.body.sessionId,
      req.body.answerId,
      req.body.labelId
    )
    // retrieve labels from the database
    const labels = await Promise.all(
      labelCorrectionEntities.map(async (label: CorrectionLabel) => {
        const labelEntity = (await this.labelService.findById(label.labelId)).get()
        const labelDTO = Mapper.map(labelEntity, LabelDTO)
        return labelDTO
      })
    )

    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('fav/:labelId')
  async favLabel(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const label = await this.labelService.findById(req.params.labelId)
    const labels = Mapper.mapAll(await this.labelService.favLabel(label.get(), req.user.id), LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('unfav/:labelId')
  async unfavLabel(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const label = await this.labelService.findById(req.params.labelId)
    const labels = Mapper.mapAll(await this.labelService.unfavLabel(label.get(), req.user.id), LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('userFavLabel')
  async userFavLabelList(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const userFav = await this.labelService.getUserFav(req.user.id)
    const labels = Mapper.mapAll(userFav, LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('list/:activityId')
  async list(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const activityId = req.params.activityId
    const labels = Mapper.mapAll(await this.labelService.list(activityId, req.user.id), LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('create/:activityId')
  async create(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const userId = req.user.id
    const activityId = req.params.activityId
    const createdLabel = {
      name: req.body.name,
      color: req.body.color,
      description: req.body.description,
    } as CreateLabel
    const labels = Mapper.mapAll(await this.labelService.saveAndList(createdLabel, activityId, userId), LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('list/:sessionId/:answerId')
  async listCorrectionLabels(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const labels = await Promise.all(
      (
        await this.correctionLabelService.list(req.params.sessionId, req.params.answerId)
      ).map(async (label: CorrectionLabel) => {
        const labelEntity = (await this.labelService.findById(label.labelId)).get()
        const labelDTO = Mapper.map(labelEntity, LabelDTO)
        return labelDTO
      })
    )
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Patch('update')
  async updateLabel(@Req() req: IRequest): Promise<LabelDTO> {
    const optionalLabel = await this.labelService.findById(req.body.id)

    if (!optionalLabel.isPresent()) {
      throw new ErrorResponse({
        message: 'Label not found',
        status: 404,
      })
    }

    const label = optionalLabel.get()
    label.name = req.body.name
    label.description = req.body.description
    label.color = req.body.color
    label.gradeChange = req.body.gradeChange

    try {
      return await this.labelService.update(label.id, label)
    } catch (error) {
      throw new ErrorResponse({
        message: 'Error while updating label',
        status: 500,
      })
    }
  }
}

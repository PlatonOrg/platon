import { Controller, Delete, Get, Patch, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ErrorResponse, ListResponse, UserRoles } from '@platon/core/common'
import { IRequest, Mapper, Roles } from '@platon/core/server'
import { CorrectionLabel, CreateLabel } from '@platon/feature/result/common'
import { LabelService } from './label.service'
import { LabelDTO } from './label.dto'
import { CorrectionLabelService } from './correction-label/correction-label.service'
import { ResourceLabelService } from './resource-label/resource-label.service'
import { ResourceLabelEntity } from './resource-label/resource-label.entity'
import { CorrectionLabelEntity } from './correction-label/correction-label.entity'

@ApiBearerAuth()
@Controller('results/labels')
@ApiTags('Results')
export class LabelController {
  constructor(
    private readonly labelService: LabelService,
    private readonly correctionLabelService: CorrectionLabelService,
    private readonly resourceLabelService: ResourceLabelService
  ) {}

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('labelize')
  async labelize(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    console.error(
      'The labelize endpoint is deprecated and will be removed in the future. Please use the new correction label endpoints.'
    )
    // const labelCorrectionEntities = await this.correctionLabelService.labelize(
    //   req.body.sessionId,
    //   req.body.answerId,
    //   req.body.labelId
    // )
    // const labels = await Promise.all(
    //   labelCorrectionEntities.map(async (label: CorrectionLabelEntity) => {
    //     if (!label.resourceLabelId) {
    //       const labelEntity = (await this.labelService.findById(label.labelId)).get()
    //       const labelDTO = Mapper.map(labelEntity, LabelDTO)
    //       labelDTO.id = label.labelId
    //       return labelDTO
    //     }
    //     const labelEntity = (await this.resourceLabelService.findById(label?.resourceLabelId)).get()
    //     const labelDTO = Mapper.map(labelEntity, LabelDTO)
    //     labelDTO.id = label.labelId
    //     return labelDTO
    //   })
    // )

    // return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
    return new ListResponse<LabelDTO>({
      resources: [],
      total: 0,
    })
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
  @Get('list/:navigationExerciseId')
  async list(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const navigationExerciseId = req.params.navigationExerciseId
    const resourceLabels = await this.resourceLabelService.list(navigationExerciseId)
    const labels = Mapper.mapAll(await this.labelService.list(navigationExerciseId), LabelDTO)

    const labelsWithGradeChange = labels.map((label) => {
      const resourceLabel = resourceLabels.find((rl: ResourceLabelEntity) => rl.labelId === label.id)
      if (resourceLabel && resourceLabel.gradeChange !== undefined) {
        return { ...label, gradeChange: resourceLabel.gradeChange }
      }
      return label
    })

    return new ListResponse<LabelDTO>({ resources: labelsWithGradeChange, total: labelsWithGradeChange.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('create/:activityId/:navigationExerciseId')
  async create(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const activityId = req.params.activityId
    const navigationExerciseId = req.params.navigationExerciseId
    const createdLabel = {
      name: req.body.name,
      color: req.body.color,
      description: req.body.description,
    } as CreateLabel
    const labels = Mapper.mapAll(
      await this.labelService.saveAndList(createdLabel, activityId, navigationExerciseId),
      LabelDTO
    )
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('list-correction/:sessionId/:answerId')
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
  @Delete('delete/:labelId')
  async deleteLabel(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const labelId = req.params.labelId
    const label = await this.labelService.findById(labelId)

    if (!label.isPresent()) {
      throw new ErrorResponse({
        message: 'Label not found',
        status: 404,
      })
    }

    try {
      await this.labelService.delete(label.get().id)
    } catch (error) {
      throw new ErrorResponse({
        message: 'Error while deleting label',
        status: 500,
      })
    }
    return new ListResponse<LabelDTO>({ resources: [], total: 0 })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Patch('update/:navigationExerciseId')
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

    try {
      await this.resourceLabelService.update(label.id, req.params.navigationExerciseId, req.body.gradeChange)
      return await this.labelService.update(label.id, label)
    } catch (error: any) {
      throw new ErrorResponse({
        message: error.message,
        status: 500,
      })
    }
  }
}

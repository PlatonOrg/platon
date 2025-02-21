import { Controller, Get, Post, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ListResponse, UserRoles } from '@platon/core/common'
import { IRequest, Mapper, Roles } from '@platon/core/server'
import { CreateLabel } from '@platon/feature/result/common'
import { LabelService } from './label.service'
import { LabelDTO } from './label.dto'
import { CorrectionLabelService } from '../correction/correction-label/correction-label.service'

@Controller('results/labels')
@ApiTags('Results')
export class LabelController {
  constructor(
    private readonly labelService: LabelService,
    private readonly correctionLabelService: CorrectionLabelService
  ) {}
  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('create/:id')
  async create(@Req() req: IRequest): Promise<ListResponse<LabelDTO>> {
    const createdLabel = {
      name: req.body.name,
      color: req.body.color,
      description: req.body.description,
    } as CreateLabel
    const labels = Mapper.mapAll(await this.labelService.saveAndList(createdLabel), LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('list')
  async list(): Promise<ListResponse<LabelDTO>> {
    const labels = Mapper.mapAll(await this.labelService.list(), LabelDTO)
    return new ListResponse<LabelDTO>({ resources: labels, total: labels.length })
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('labelize')
  async a(@Req() req: IRequest) {
    await this.correctionLabelService.labelize(req.body.sessionId, req.body.answerId, req.body.labelId)
    return {}
  }
}

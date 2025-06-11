import { Repository } from 'typeorm'
import { CorrectionLabelEntity } from './correction-label.entity'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ResourceLabelEntity } from '../resource-label/resource-label.entity'

@Injectable()
export class CorrectionLabelService {
  constructor(
    @InjectRepository(CorrectionLabelEntity)
    private readonly correctionLabelRepository: Repository<CorrectionLabelEntity>,
    @InjectRepository(ResourceLabelEntity)
    private readonly resourceLabelRepository: Repository<ResourceLabelEntity>
  ) {}

  async list(sessionId: string, answerId: string): Promise<CorrectionLabelEntity[]> {
    return this.correctionLabelRepository.find({ where: { sessionId, answerId } })
  }

  async labelize(
    sessionId: string,
    answerId: string,
    labelId: string,
    correctionId: string
  ): Promise<CorrectionLabelEntity[]> {
    const existing = await this.correctionLabelRepository.findOne({ where: { sessionId, answerId, labelId } })
    if (existing) {
      return this.list(sessionId, answerId)
    }
    const rl = await this.resourceLabelRepository.findOne({ where: { labelId } })
    if (!rl) {
      console.warn(`Resource label with ID ${labelId} not found, is that a favorite label?`)
      await this.correctionLabelRepository.save({ sessionId, answerId, labelId, correctionId })
    } else {
      await this.correctionLabelRepository.save({
        sessionId,
        answerId,
        labelId,
        resourceLabel: rl,
        correctionId: correctionId,
      })
    }

    return this.list(sessionId, answerId)
  }
}

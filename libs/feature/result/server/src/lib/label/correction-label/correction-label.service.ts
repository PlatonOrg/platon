import { Repository } from 'typeorm'
import { CorrectionLabelEntity } from './correction-label.entity'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class CorrectionLabelService {
  constructor(
    @InjectRepository(CorrectionLabelEntity)
    private readonly correctionLabelRepository: Repository<CorrectionLabelEntity>
  ) {}

  async list(sessionId: string, answerId: string): Promise<CorrectionLabelEntity[]> {
    return this.correctionLabelRepository.find({ where: { sessionId, answerId } })
  }

  async labelize(sessionId: string, answerId: string, labelId: string): Promise<CorrectionLabelEntity[]> {
    const existing = await this.correctionLabelRepository.findOne({ where: { sessionId, answerId, labelId } })
    if (existing) {
      await this.correctionLabelRepository.remove(existing)
      return this.list(sessionId, answerId)
    }
    await this.correctionLabelRepository.save({ sessionId, answerId, labelId })
    return this.list(sessionId, answerId)
  }
}

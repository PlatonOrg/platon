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

  async list(sessionId: string): Promise<CorrectionLabelEntity[]> {
    return this.correctionLabelRepository.find({ where: { sessionId } })
  }

  labelize(sessionId: string, answerId: string, labelId: string): Promise<CorrectionLabelEntity> {
    return this.correctionLabelRepository.save({ sessionId, answerId, labelId })
  }
}

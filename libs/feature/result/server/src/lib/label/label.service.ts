import { InjectRepository } from '@nestjs/typeorm'
import { LabelEntity } from './label.entity'
import { Repository } from 'typeorm'
import { CreateLabel } from '@platon/feature/result/common'
import { Injectable } from '@nestjs/common'

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(LabelEntity)
    private readonly labelRepository: Repository<LabelEntity>
  ) {}

  async saveAndList(label: CreateLabel): Promise<LabelEntity[]> {
    await this.labelRepository.save(label)
    return this.labelRepository.find()
  }

  async list(): Promise<LabelEntity[]> {
    return this.labelRepository.find()
  }
}

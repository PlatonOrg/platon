import { Injectable } from '@nestjs/common'
import { ResourceLabelEntity } from './resource-label.entity'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Optional } from 'typescript-optional'

@Injectable()
export class ResourceLabelService {
  constructor(
    @InjectRepository(ResourceLabelEntity)
    private readonly correctionLabelRepository: Repository<ResourceLabelEntity>
  ) {}

  async update(labelId: string, navigationExerciseId: string, gradeChange: string): Promise<void> {
    const label = await this.correctionLabelRepository.findOne({ where: { labelId, navigationExerciseId } })
    if (!label) {
      console.warn(
        `Resource label with ID ${labelId} not found for navigationExerciseId: ${navigationExerciseId}, is that a favorite label?`
      )
      return
    }
    label.gradeChange = gradeChange
    await this.correctionLabelRepository.save(label)
  }

  async list(navigationExerciseId: string): Promise<ResourceLabelEntity[]> {
    return this.correctionLabelRepository.find({ where: { navigationExerciseId } })
  }

  async findById(id: string): Promise<Optional<ResourceLabelEntity>> {
    const label = await this.correctionLabelRepository.findOne({ where: { id } })
    if (!label) {
      return Optional.empty()
    }
    return Optional.of(label)
  }
}

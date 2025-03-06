import { InjectRepository } from '@nestjs/typeorm'
import { LabelEntity } from './label.entity'
import { Repository } from 'typeorm'
import { CreateLabel } from '@platon/feature/result/common'
import { Injectable } from '@nestjs/common'
import { Optional } from 'typescript-optional'
import { CourseLabelEntity } from './course-label/course-label.entity'
import { UserFavoriteLabel } from './user-favorite-label/user-favorite-label.entity'

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(LabelEntity)
    private readonly labelRepository: Repository<LabelEntity>,
    @InjectRepository(CourseLabelEntity)
    private readonly courseLabelRepository: Repository<CourseLabelEntity>,
    @InjectRepository(UserFavoriteLabel)
    private readonly userFavoriteLabelRepository: Repository<UserFavoriteLabel>
  ) {}

  async saveAndList(label: CreateLabel, courseId: string, userId: string): Promise<LabelEntity[]> {
    const labelEntity = await this.labelRepository.save(label)
    await this.courseLabelRepository.save({ courseId, labelId: labelEntity.id })
    return this.list(courseId, userId)
  }

  async list(courseId: string, userId: string): Promise<LabelEntity[]> {
    const courseLabels = await this.courseLabelRepository.find({ where: { courseId } })
    const courseLabelIds = courseLabels.map((courseLabel) => courseLabel.labelId)
    const labels = await this.convertLabelIdsToEntity(courseLabelIds)
    const userLabels = await this.getUserFav(userId)
    const userLabelIds = new Set(userLabels.map((label) => label.id))
    const uniqueLabels = userLabels.concat(labels.filter((label) => !userLabelIds.has(label.id)))
    return uniqueLabels
  }

  async findById(id: string): Promise<Optional<LabelEntity>> {
    return Optional.ofNullable(await this.labelRepository.findOne({ where: { id } }))
  }

  async getUserFav(userId: string): Promise<LabelEntity[]> {
    const labelsId = (await this.userFavoriteLabelRepository.find({ where: { userId: userId } })).map((l) => l.labelId)
    return this.convertLabelIdsToEntity(labelsId)
  }

  async favLabel(label: LabelEntity, userId: string): Promise<LabelEntity[]> {
    await this.userFavoriteLabelRepository.save({ userId, labelId: label.id })
    return this.getUserFav(userId)
  }

  async unfavLabel(label: LabelEntity, userId: string): Promise<LabelEntity[]> {
    await this.userFavoriteLabelRepository.delete({ userId, labelId: label.id })
    return this.getUserFav(userId)
  }

  private async convertLabelIdsToEntity(labelIds: string[]): Promise<LabelEntity[]> {
    return (
      await Promise.all(labelIds.map((labelId) => this.labelRepository.findOne({ where: { id: labelId } })))
    ).filter((label) => label !== undefined) as LabelEntity[]
  }
}

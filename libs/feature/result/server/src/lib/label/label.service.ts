import { InjectRepository } from '@nestjs/typeorm'
import { LabelEntity } from './label.entity'
import { Repository } from 'typeorm'
import { CreateLabel } from '@platon/feature/result/common'
import { Injectable, NotFoundException } from '@nestjs/common'
import { Optional } from 'typescript-optional'
import { ActivityLabelEntity } from './activity-label/activity-label.entity'
import { UserFavoriteLabel } from './user-favorite-label/user-favorite-label.entity'

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(LabelEntity)
    private readonly labelRepository: Repository<LabelEntity>,
    @InjectRepository(ActivityLabelEntity)
    private readonly activityLabelRepository: Repository<ActivityLabelEntity>,
    @InjectRepository(UserFavoriteLabel)
    private readonly userFavoriteLabelRepository: Repository<UserFavoriteLabel>
  ) {}

  async saveAndList(label: CreateLabel, activityId: string, userId: string): Promise<LabelEntity[]> {
    const labelEntity = await this.labelRepository.save(label)
    await this.activityLabelRepository.save({ activityId, labelId: labelEntity.id })
    return this.list(activityId, userId)
  }

  async list(activityId: string, userId: string): Promise<LabelEntity[]> {
    const activityLabels = await this.activityLabelRepository.find({ where: { activityId } })
    const activityLabelIds = activityLabels.map((activityLabel) => activityLabel.labelId)
    const labels = await this.convertLabelIdsToEntity(activityLabelIds)
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

  async update(id: string, updates: Partial<LabelEntity>): Promise<LabelEntity> {
    const labelEntity = await this.labelRepository.findOne({ where: { id } })

    if (!labelEntity) {
      throw new NotFoundException(`Label with ID ${id} not found`)
    }

    Object.assign(labelEntity, updates)

    return this.labelRepository.save(labelEntity)
  }

  private async convertLabelIdsToEntity(labelIds: string[]): Promise<LabelEntity[]> {
    return (
      await Promise.all(labelIds.map((labelId) => this.labelRepository.findOne({ where: { id: labelId } })))
    ).filter((label) => label !== undefined) as LabelEntity[]
  }
}

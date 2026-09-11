import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CourseLessonProgressEntity } from './lesson-progress.entity'

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(CourseLessonProgressEntity)
    private readonly repository: Repository<CourseLessonProgressEntity>
  ) {}

  async markCompleted(activityId: string, userId: string): Promise<void> {
    const existing = await this.repository.findOne({ where: { activityId, userId } })
    if (existing) {
      return
    }
    await this.repository.save({ activityId, userId, completedAt: new Date() })
  }

  async findCompletedActivityIds(activityIds: string[], userId: string): Promise<Set<string>> {
    if (!activityIds.length) {
      return new Set()
    }
    const rows = await this.repository
      .createQueryBuilder('progress')
      .select('progress.activity_id', 'activityId')
      .where('progress.activity_id IN (:...activityIds)', { activityIds })
      .andWhere('progress.user_id = :userId', { userId })
      .getRawMany<{ activityId: string }>()
    return new Set(rows.map((row) => row.activityId))
  }
}

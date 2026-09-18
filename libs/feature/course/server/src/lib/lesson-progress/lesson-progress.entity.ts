import { BaseEntity, UserEntity } from '@platon/core/server'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { ActivityEntity } from '../activity/activity.entity'

@Entity('CourseLessonProgresses')
@Unique('CourseLessonProgresses_activity_user_idx', ['activityId', 'userId'])
export class CourseLessonProgressEntity extends BaseEntity {
  @Index('CourseLessonProgresses_activity_id_idx')
  @Column({ name: 'activity_id' })
  activityId!: string

  @ManyToOne(() => ActivityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity!: ActivityEntity

  @Index('CourseLessonProgresses_user_id_idx')
  @Column({ name: 'user_id' })
  userId!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Column({ name: 'completed_at', type: 'timestamp with time zone' })
  completedAt!: Date
}

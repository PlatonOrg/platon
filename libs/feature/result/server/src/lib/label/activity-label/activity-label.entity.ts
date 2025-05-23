import { BaseEntity } from '@platon/core/server'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { LabelEntity } from '../label.entity'
import { ActivityEntity } from '@platon/feature/course/server'

@Entity('ActivityLabels')
export class ActivityLabelEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'activity_id' })
  activityId!: string

  @ManyToOne(() => ActivityEntity)
  @JoinColumn({ name: 'activity_id' })
  activity!: ActivityEntity

  @Column({ type: 'uuid', name: 'label_id' })
  labelId!: string

  @ManyToOne(() => LabelEntity)
  @JoinColumn({ name: 'label_id' })
  label!: LabelEntity
}

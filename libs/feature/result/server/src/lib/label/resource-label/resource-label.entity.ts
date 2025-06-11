import { BaseEntity } from '@platon/core/server'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { LabelEntity } from '../label.entity'
import { ResourceEntity } from '@platon/feature/resource/server'

@Entity('ResourceLabels')
export class ResourceLabelEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'resource_id' })
  resourceId!: string

  @ManyToOne(() => ResourceEntity)
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity

  @Column({ type: 'uuid', name: 'label_id' })
  labelId!: string

  @ManyToOne(() => LabelEntity)
  @JoinColumn({ name: 'label_id' })
  label!: LabelEntity

  @Column({ type: 'uuid', nullable: false })
  navigationExerciseId!: string

  @Column({ type: 'varchar', length: 4, default: '-0' })
  gradeChange!: string
}

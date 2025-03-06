import { BaseEntity } from '@platon/core/server'
import { CourseEntity } from '@platon/feature/course/server'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { LabelEntity } from '../label.entity'

@Entity('CourseLabels')
export class CourseLabelEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  courseId!: string

  @ManyToOne(() => CourseEntity)
  @JoinColumn({ name: 'course_id' })
  course!: CourseEntity

  @Column({ type: 'uuid' })
  labelId!: string

  @ManyToOne(() => LabelEntity)
  @JoinColumn({ name: 'label_id' })
  label!: LabelEntity
}

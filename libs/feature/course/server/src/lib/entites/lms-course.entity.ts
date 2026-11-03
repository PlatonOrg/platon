import { BaseEntity } from '@platon/core/server'
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { CourseEntity } from './course.entity'

@Entity('LmsCourses')
@Unique('LmsCourses_unique_idx', ['ltiPlatformId', 'lmsCourseId', 'courseId'])
export class LmsCourseEntity extends BaseEntity {
  @Column({ name: 'lms_course_id' })
  lmsCourseId!: string

  @Column({ name: 'lti_platform_id', type: 'uuid' })
  ltiPlatformId!: string

  @Column({ name: 'course_id' })
  courseId!: string

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: CourseEntity
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEntity } from '@platon/core/server'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CourseEntity } from '@platon/feature/course/server'
import { EditorJsData } from '@platon/feature/tests/common'

@Entity('Test')
export class TestEntity extends BaseEntity {
  @Index('Test_course_id_idx')
  @Column({ name: 'course_id' })
  courseId!: string

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: CourseEntity

  @Column({ name: 'terms', type: 'jsonb', nullable: false, default: '{}' })
  terms!: EditorJsData

  @Column({ name: 'mail_content', type: 'jsonb', nullable: false, default: '{}' })
  mailContent!: EditorJsData

  @Column({ name: 'mail_subject', type: 'varchar', nullable: false, default: '' })
  mailSubject!: string
}

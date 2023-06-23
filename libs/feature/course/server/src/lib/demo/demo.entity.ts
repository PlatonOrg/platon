import { BaseEntity } from '@platon/core/server';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CourseEntity } from '../course.entity';

@Entity('CourseDemos')
export class DemoEntity extends BaseEntity {
  @ManyToOne((type) => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: CourseEntity;
}

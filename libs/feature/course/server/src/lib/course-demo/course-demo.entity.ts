import { BaseEntity } from '@platon/core/server';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CourseEntity } from '../course.entity';

@Entity('CourseDemos')
export class CourseDemoEntity extends BaseEntity {
  @ManyToOne((type) => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: CourseEntity;
}

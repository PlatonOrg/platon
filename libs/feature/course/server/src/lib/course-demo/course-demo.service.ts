import { Injectable } from '@nestjs/common';
import { CourseDemoEntity } from './course-demo.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseEntity } from '../course.entity';
import { NotFoundResponse } from '@platon/core/common';

@Injectable()
export class CourseDemoService {
  constructor(
    @InjectRepository(CourseDemoEntity)
    private readonly repository: Repository<CourseDemoEntity>
  ) {}

  async create(course: CourseEntity): Promise<CourseDemoEntity> {
    return this.repository.save(this.repository.create({ course }));
  }

  async findByUri(uri: string): Promise<CourseDemoEntity> {
    const course = await this.repository.findOne({
      where: { id: uri },
      relations: { course: true },
    });

    if (!course) {
      throw new NotFoundResponse(`No demo found at this location.`);
    }

    return course;
  }
}

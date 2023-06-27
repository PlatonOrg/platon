import { Injectable } from '@nestjs/common';
import { CourseDemoEntity } from './course-demo.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseEntity } from '../course.entity';
import { AuthToken, NotFoundResponse } from '@platon/core/common';
import { AuthService } from '@platon/core/server';
import { CourseMemberService } from '../course-member/course-member.service';

@Injectable()
export class CourseDemoService {
  constructor(
    @InjectRepository(CourseDemoEntity)
    private readonly repository: Repository<CourseDemoEntity>,
    private readonly authService: AuthService,
    private readonly courseMemberService: CourseMemberService
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

  async registerToDemo(demo: CourseDemoEntity): Promise<AuthToken> {
    const { authToken, userId } = await this.authService.signInDemo();
    await this.courseMemberService.addUser(demo.course.id, userId);
    return authToken;
  }
}

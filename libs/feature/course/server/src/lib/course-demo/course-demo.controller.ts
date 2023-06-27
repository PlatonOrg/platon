import { Controller, Get, Param, Post } from '@nestjs/common';
import { CourseDemoService } from './course-demo.service';
import { Public } from '@platon/core/server';

@Controller('courses/demo')
export class CourseDemoController {
  constructor(private courseDemoService: CourseDemoService) {}

  @Public()
  @Get(':uri')
  async accessDemo(@Param('uri') uri: string): Promise<any> {
    const demo = await this.courseDemoService.findByUri(uri);
    return { courseId: demo.course.id };
  }
}

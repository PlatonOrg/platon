import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CourseDemoService } from './course-demo.service';
import { IRequest, Mapper, Public, Roles } from '@platon/core/server';
import {
  CreatedResponse,
  ForbiddenResponse,
  ItemResponse,
  NotFoundResponse,
  UserRoles,
} from '@platon/core/common';
import { CourseService } from '../course.service';
import { CourseMemberService } from '../course-member/course-member.service';
import {
  CourseDemoCreateDTO,
  CourseDemoDTO,
  CourseDemoGetDTO,
} from './course-demo.dto';

@Controller('courses/demo')
export class CourseDemoController {
  constructor(
    private readonly courseDemoService: CourseDemoService,
    private readonly courseService: CourseService,
    private readonly courseMemberService: CourseMemberService
  ) {}

  @Public()
  @Get(':uri')
  async accessDemo(@Param() params: CourseDemoGetDTO): Promise<any> {
    const demo = await this.courseDemoService.findByUri(params.uri);

    return { courseId: demo.course.id };
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post(':id')
  async createDemo(
    @Req() req: IRequest,
    @Param() params: CourseDemoCreateDTO
  ): Promise<CreatedResponse<CourseDemoDTO>> {
    const optional = await this.courseService.findById(params.id);
    const course = optional.orElseThrow(
      () => new NotFoundResponse(`Course not found: ${params.id}`)
    );

    if (!(await this.courseMemberService.isMember(params.id, req.user.id))) {
      throw new ForbiddenResponse(`You are not a member of this course`);
    }

    const demo = await this.courseDemoService.create(course);
    const resource = Mapper.map(
      { courseId: demo.course.id, uri: demo.id },
      CourseDemoDTO
    );

    return new CreatedResponse({ resource });
  }
}

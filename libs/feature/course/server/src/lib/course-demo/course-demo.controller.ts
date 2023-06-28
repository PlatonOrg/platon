import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { CourseDemoService } from './course-demo.service';
import { IRequest, Mapper, Public, Roles } from '@platon/core/server';
import {
  CreatedResponse,
  ForbiddenResponse,
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
import { Response } from 'express';
import { Request } from 'express';

@Controller('courses/demo')
export class CourseDemoController {
  constructor(
    private readonly courseDemoService: CourseDemoService,
    private readonly courseService: CourseService,
    private readonly courseMemberService: CourseMemberService
  ) {}

  @Public()
  @Get(':uri')
  async accessDemo(
    @Param() params: CourseDemoGetDTO,
    @Res() res: Response,
    @Req() req: IRequest
  ) {
    const demo = await this.courseDemoService.findByUri(params.uri);
    const nextUrl = `/courses/${demo.course.id}`;
    if (req.user) {
      const isMember = await this.courseMemberService.isMember(
        demo.course.id,
        req.user.id
      );
      if (!isMember) {
        await this.courseMemberService.addUser(demo.course.id, req.user.id);
      }
      return res.redirect(302, nextUrl);
    }

    const token = await this.courseDemoService.registerToDemo(demo);
    return res.redirect(
      302,
      `/login?lti-launch=true&access-token=${token.accessToken}&refresh-token=${token.refreshToken}&next=${nextUrl}`
    );
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

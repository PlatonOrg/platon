import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
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
  CourseDemoAccessAnswerDTO,
  CourseDemoCreateDTO,
  CourseDemoDTO,
  CourseDemoGetDTO,
} from './course-demo.dto';
import { Response } from 'express';

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
    @Req() req: IRequest
  ): Promise<ItemResponse<CourseDemoAccessAnswerDTO>> {
    const demo = await this.courseDemoService.findByUri(params.uri);
    if (req.user) {
      if (
        !(await this.courseMemberService.isMember(demo.course.id, req.user.id))
      ) {
        await this.courseMemberService.addUser(demo.course.id, req.user.id);
      }
      const resource = Mapper.map(
        { courseId: demo.course.id },
        CourseDemoAccessAnswerDTO
      );
      return new ItemResponse({ resource });
    }

    const token = await this.courseDemoService.registerToDemo(demo);
    const resource = Mapper.map(
      { courseId: demo.course.id, ...token },
      CourseDemoAccessAnswerDTO
    );
    return new ItemResponse({ resource });
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post()
  async createDemo(
    @Req() req: IRequest,
    @Body() body: CourseDemoCreateDTO
  ): Promise<CreatedResponse<CourseDemoDTO>> {
    const optional = await this.courseService.findById(body.id);
    const course = optional.orElseThrow(
      () => new NotFoundResponse(`Course not found: ${body.id}`)
    );

    if (!(await this.courseMemberService.isMember(body.id, req.user.id))) {
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

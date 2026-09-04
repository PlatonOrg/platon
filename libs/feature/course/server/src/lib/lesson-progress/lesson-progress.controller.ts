import { Controller, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { NoContentResponse, NotFoundResponse } from '@platon/core/common'
import { IRequest, UUIDParam } from '@platon/core/server'
import { ActivityService } from '../activity/activity.service'
import { CoursePermissionsService } from '../permissions/permissions.service'
import { LessonProgressService } from './lesson-progress.service'

@ApiBearerAuth()
@Controller('courses/:courseId/activities/:activityId/lesson-progress')
@ApiTags('Courses')
export class LessonProgressController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly permissionsService: CoursePermissionsService,
    private readonly lessonProgressService: LessonProgressService
  ) {}

  @Post()
  async markCompleted(
    @Req() req: IRequest,
    @UUIDParam('courseId') courseId: string,
    @UUIDParam('activityId') activityId: string
  ): Promise<NoContentResponse> {
    const optional = await this.activityService.findByCourseId(courseId, activityId)
    const activity = optional.orElseThrow(() => new NotFoundResponse(`CourseActivity not found: ${activityId}`))

    await this.permissionsService.ensureActivityReadPermission(activity, req)
    await this.lessonProgressService.markCompleted(activityId, req.user.id)
    return new NoContentResponse()
  }
}

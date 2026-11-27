import { Body, Controller, Post, Req } from '@nestjs/common'
import { MonitorPresencePayload } from '@platon/feature/course/common'
import { IRequest, PubSubService, Roles } from '@platon/core/server'
import { MONITOR_PRESENCE_SUBSCRIBE, MONITOR_PRESENCE_UNSUBSCRIBE } from '@platon/feature/course/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CoursePermissionsService } from '../permissions/permissions.service'

@ApiBearerAuth()
@Controller('courses/monitor-presence')
@ApiTags('Courses')
@Roles('teacher', 'admin')
export class CourseMonitorPresenceController {
  constructor(
    private readonly pubSubService: PubSubService,
    private readonly permissionService: CoursePermissionsService
  ) {}

  @Post('subscribe')
  async subscribeToMonitorPresence(
    @Body() payload: MonitorPresencePayload,
    @Req() req: IRequest
  ): Promise<{ success: boolean }> {
    await this.permissionService.ensureActivityWritePermission(payload.activityId, req)

    await this.pubSubService.publish(MONITOR_PRESENCE_SUBSCRIBE, payload)
    return { success: true }
  }

  @Post('unsubscribe')
  async unsubscribeFromMonitorPresence(
    @Body() payload: MonitorPresencePayload,
    @Req() req: IRequest
  ): Promise<{ success: boolean }> {
    await this.permissionService.ensureActivityWritePermission(payload.activityId, req)

    await this.pubSubService.publish(MONITOR_PRESENCE_UNSUBSCRIBE, payload)
    return { success: true }
  }
}

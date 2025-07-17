import { Body, Controller, Post } from '@nestjs/common'
import { MonitorPresencePayload } from '@platon/feature/course/common'
import { PubSubService } from '@platon/core/server'
import { MONITOR_PRESENCE_SUBSCRIBE, MONITOR_PRESENCE_UNSUBSCRIBE } from '@platon/feature/course/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

@ApiBearerAuth()
@Controller('courses/monitor-presence')
@ApiTags('Courses')
export class CourseMonitorPresenceController {
  constructor(private readonly pubSubService: PubSubService) {}

  @Post('subscribe')
  async subscribeToMonitorPresence(@Body() payload: MonitorPresencePayload): Promise<{ success: boolean }> {
    // TODO : Security check: ensure the user ID in the payload matches the authenticated user

    await this.pubSubService.publish(MONITOR_PRESENCE_SUBSCRIBE, payload)
    return { success: true }
  }

  @Post('unsubscribe')
  async unsubscribeFromMonitorPresence(@Body() payload: MonitorPresencePayload): Promise<{ success: boolean }> {
    // TODO : Security check: ensure the user ID in the payload matches the authenticated user

    await this.pubSubService.publish(MONITOR_PRESENCE_UNSUBSCRIBE, payload)
    return { success: true }
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { NotificationService } from './notification.service'

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name)
  constructor(private readonly notificationService: NotificationService) {}

  // Every Monday at 4.30am
  @Cron('30 4 * * 1')
  async handleCron() {
    this.logger.log('Running scheduled task to delete old notifications')
    await this.notificationService.deleteOldNotifications()
  }
}

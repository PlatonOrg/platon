import { Global, Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationEntity } from './notification.entity'
import { NotificationChangeResolver, NotificationResolver } from './notification.resolver'
import { NotificationService } from './notification.service'
import { NotificationSchedulerService } from './notification-scheduler.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  providers: [NotificationService, NotificationResolver, NotificationChangeResolver, NotificationSchedulerService],
  exports: [TypeOrmModule, NotificationService],
})
export class FeatureNotificationServerModule implements OnModuleInit {
  constructor(private readonly notificationService: NotificationService) {}

  async onModuleInit() {
    await this.notificationService.init()
  }
}

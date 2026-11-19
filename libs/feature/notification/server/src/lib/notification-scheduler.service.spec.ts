import { Test, TestingModule } from '@nestjs/testing'
import { NotificationSchedulerService } from './notification-scheduler.service'
import { NotificationService } from './notification.service'

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService
  let notificationService: jest.Mocked<NotificationService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: NotificationService, useValue: { deleteOldNotifications: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile()

    service = module.get(NotificationSchedulerService)
    notificationService = module.get(NotificationService)
  })

  describe('handleCron', () => {
    it('devrait déclencher la suppression des notifications expirées', async () => {
      await service.handleCron()

      expect(notificationService.deleteOldNotifications).toHaveBeenCalledTimes(1)
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { UserSchedulerService } from './user-scheduler.service'
import { UserService } from './user.service'

describe('UserSchedulerService', () => {
  let service: UserSchedulerService
  let userService: jest.Mocked<UserService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSchedulerService,
        { provide: UserService, useValue: { deleteInactiveUsers: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile()

    service = module.get(UserSchedulerService)
    userService = module.get(UserService)
  })

  describe('handleCron', () => {
    it('devrait déclencher la suppression des utilisateurs inactifs', async () => {
      await service.handleCron()

      expect(userService.deleteInactiveUsers).toHaveBeenCalledTimes(1)
    })
  })
})

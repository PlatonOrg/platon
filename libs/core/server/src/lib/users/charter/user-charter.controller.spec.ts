import { Test, TestingModule } from '@nestjs/testing'
import { UserCharterController } from './user-charter.controller'
import { UserCharterService } from './user-charter.service'
import { UserCharterEntity } from './user-charter.entity'

describe('UserCharterController', () => {
  let controller: UserCharterController
  let service: jest.Mocked<UserCharterService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCharterController],
      providers: [
        {
          provide: UserCharterService,
          useValue: { acceptUserCharter: jest.fn(), findUserCharterById: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(UserCharterController)
    service = module.get(UserCharterService)
  })

  describe('acceptUserCharter', () => {
    it('devrait déléguer au service et retourner la ressource mappée', async () => {
      const charter = { id: 'user-1', acceptedUserCharter: true } as UserCharterEntity
      service.acceptUserCharter.mockResolvedValue(charter)

      const result = await controller.acceptUserCharter('user-1')

      expect(service.acceptUserCharter).toHaveBeenCalledWith('user-1')
      expect(result.resource.acceptedUserCharter).toBe(true)
    })
  })

  describe('findUserCharterById', () => {
    it('devrait déléguer au service et retourner la ressource mappée', async () => {
      const charter = { id: 'user-1', acceptedUserCharter: false } as UserCharterEntity
      service.findUserCharterById.mockResolvedValue(charter)

      const result = await controller.findUserCharterById('user-1')

      expect(service.findUserCharterById).toHaveBeenCalledWith('user-1')
      expect(result.resource.acceptedUserCharter).toBe(false)
    })
  })
})

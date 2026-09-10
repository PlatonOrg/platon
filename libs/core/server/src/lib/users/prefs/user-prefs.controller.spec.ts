import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { createUserEntity } from '@platon/core/testing/server'
import type { IRequest } from '../../auth'
import { UserPrefsController } from './user-prefs.controller'
import { UserPrefsService } from './user-prefs.service'
import { UserPrefsEntity } from './user-prefs.entity'

describe('UserPrefsController', () => {
  let controller: UserPrefsController
  let service: jest.Mocked<UserPrefsService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPrefsController],
      providers: [
        {
          provide: UserPrefsService,
          useValue: {
            findByUserId: jest.fn(),
            updateByUserId: jest.fn(),
            fromInput: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(UserPrefsController)
    service = module.get(UserPrefsService)
  })

  const buildReq = (username: string, id = 'user-1') =>
    ({ user: createUserEntity({ id, username }) } as unknown as IRequest)

  describe('find', () => {
    it("devrait retourner les préférences mappées de l'utilisateur courant", async () => {
      const prefs = { levels: [], topics: [] } as unknown as UserPrefsEntity
      service.findByUserId.mockResolvedValue(prefs)
      const req = buildReq('testuser')

      const result = await controller.find(req, 'testuser')

      expect(service.findByUserId).toHaveBeenCalledWith('user-1')
      expect(result.resource).toBeDefined()
    })

    it("devrait rejeter avec UnauthorizedException si le username ne correspond pas à l'utilisateur connecté", async () => {
      const req = buildReq('testuser')

      await expect(controller.find(req, 'someone-else')).rejects.toThrow(UnauthorizedException)
      expect(service.findByUserId).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it("devrait mettre à jour les préférences de l'utilisateur courant", async () => {
      const fromInputResult = { levels: [], topics: [] } as unknown as UserPrefsEntity
      const updated = { levels: [], topics: [] } as unknown as UserPrefsEntity
      service.fromInput.mockResolvedValue(fromInputResult)
      service.updateByUserId.mockResolvedValue(updated)
      const req = buildReq('testuser')

      const result = await controller.update(req, 'testuser', { levels: ['level-1'] })

      expect(service.fromInput).toHaveBeenCalledWith({ levels: ['level-1'] })
      expect(service.updateByUserId).toHaveBeenCalledWith('user-1', fromInputResult)
      expect(result.resource).toBeDefined()
    })

    it("devrait rejeter avec UnauthorizedException si le username ne correspond pas à l'utilisateur connecté", async () => {
      const req = buildReq('testuser')

      await expect(controller.update(req, 'someone-else', {})).rejects.toThrow(UnauthorizedException)
      expect(service.updateByUserId).not.toHaveBeenCalled()
    })
  })
})

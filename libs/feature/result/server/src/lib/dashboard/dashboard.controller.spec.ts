import { Test } from '@nestjs/testing'
import { ForbiddenResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { DashboardOutput } from '@platon/feature/result/common'
import { SessionDataEntity } from '../sessions/session-data.entity'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

describe('DashboardController', () => {
  let controller: DashboardController
  let service: jest.Mocked<
    Pick<DashboardService, 'ofUser' | 'ofSession' | 'ofActivity' | 'ofActivityForDate' | 'ofResource'>
  >

  beforeEach(async () => {
    service = {
      ofUser: jest.fn(),
      ofSession: jest.fn(),
      ofActivity: jest.fn(),
      ofActivityForDate: jest.fn(),
      ofResource: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [DashboardController, { provide: DashboardService, useValue: service }],
    }).compile()

    controller = module.get(DashboardController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("ofUser devrait déléguer au service avec l'utilisateur courant", async () => {
    const req = { user: { id: 'user-1' } } as IRequest
    service.ofUser.mockResolvedValue({} as DashboardOutput)

    await controller.ofUser(req)

    expect(service.ofUser).toHaveBeenCalledWith(req.user)
  })

  describe('ofSession', () => {
    it('devrait lever une ForbiddenResponse si la session appartient à un autre utilisateur', async () => {
      const req = { user: { id: 'user-1' } } as IRequest
      service.ofSession.mockResolvedValue([
        { id: 'session-1', userId: 'user-2' } as SessionDataEntity,
        {} as DashboardOutput,
      ])

      await expect(controller.ofSession(req, 'session-1')).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it("devrait retourner le résultat si la session appartient à l'utilisateur", async () => {
      const req = { user: { id: 'user-1' } } as IRequest
      const output = { key: 'value' } as unknown as DashboardOutput
      service.ofSession.mockResolvedValue([{ id: 'session-1', userId: 'user-1' } as SessionDataEntity, output])

      const result = await controller.ofSession(req, 'session-1')

      expect(result).toBe(output)
    })

    it("devrait retourner le résultat si la session n'a pas de propriétaire", async () => {
      const req = { user: { id: 'user-1' } } as IRequest
      const output = {} as DashboardOutput
      service.ofSession.mockResolvedValue([{ id: 'session-1', userId: undefined } as SessionDataEntity, output])

      const result = await controller.ofSession(req, 'session-1')

      expect(result).toBe(output)
    })
  })

  it('ofActivity devrait déléguer au service', async () => {
    service.ofActivity.mockResolvedValue({} as DashboardOutput)

    await controller.ofActivity('activity-1')

    expect(service.ofActivity).toHaveBeenCalledWith('activity-1')
  })

  it('ofActivityForDate devrait convertir les timestamps en dates', async () => {
    service.ofActivityForDate.mockResolvedValue([])

    await controller.ofActivityForDate('activity-1', 1704067200000, 1706745600000)

    expect(service.ofActivityForDate).toHaveBeenCalledWith(
      'activity-1',
      new Date(1704067200000),
      new Date(1706745600000)
    )
  })

  it('ofResource devrait déléguer au service', async () => {
    service.ofResource.mockResolvedValue({} as DashboardOutput)

    await controller.ofResource('resource-1')

    expect(service.ofResource).toHaveBeenCalledWith('resource-1')
  })
})

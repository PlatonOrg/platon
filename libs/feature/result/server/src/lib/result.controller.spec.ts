import { Test } from '@nestjs/testing'
import { ForbiddenResponse, UserRoles } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import {
  ACTIVITY_ANSWER_RATE,
  ACTIVITY_DROP_OUT_RATE,
  ACTIVITY_EXERCISE_RESULTS,
  ACTIVITY_USER_RESULTS,
  DashboardOutput,
  SESSION_AVERAGE_DURATION,
  SESSION_AVERAGE_SCORE,
  SESSION_SUCCESS_RATE,
  UserResults,
} from '@platon/feature/result/common'
import { DashboardService } from './dashboard/dashboard.service'
import { ResultController } from './result.controller'
import { SessionDataEntity } from './sessions/session-data.entity'

describe('ResultController', () => {
  let controller: ResultController
  let service: jest.Mocked<Pick<DashboardService, 'ofActivity' | 'ofSession'>>

  beforeEach(async () => {
    service = { ofActivity: jest.fn(), ofSession: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [ResultController, { provide: DashboardService, useValue: service }],
    }).compile()

    controller = module.get(ResultController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('activityResults', () => {
    it('devrait mapper les clés de sortie du dashboard vers ActivityResults', async () => {
      service.ofActivity.mockResolvedValue({
        [ACTIVITY_ANSWER_RATE]: 80,
        [ACTIVITY_DROP_OUT_RATE]: 20,
        [SESSION_AVERAGE_SCORE]: 75,
        [SESSION_AVERAGE_DURATION]: 300,
        [SESSION_SUCCESS_RATE]: 60,
        [ACTIVITY_USER_RESULTS]: [],
        [ACTIVITY_EXERCISE_RESULTS]: [],
      } as unknown as DashboardOutput)

      const result = await controller.activityResults('activity-1')

      expect(result).toEqual({
        answerRate: 80,
        dropoutRate: 20,
        averageScore: 75,
        averageDuration: 300,
        successRate: 60,
        users: [],
        exercises: [],
      })
    })
  })

  describe('sessionResults', () => {
    it("devrait lever une ForbiddenResponse si un étudiant consulte la session d'un autre", async () => {
      service.ofSession.mockResolvedValue([{ userId: 'user-2' } as SessionDataEntity, {} as DashboardOutput])
      const req = { user: { id: 'user-1', role: UserRoles.student } } as IRequest

      await expect(controller.sessionResults(req, 'session-1')).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it("devrait autoriser un enseignant à consulter la session de quelqu'un d'autre", async () => {
      const userResults = { id: 'user-2' } as UserResults
      service.ofSession.mockResolvedValue([
        { userId: 'user-2' } as SessionDataEntity,
        { [ACTIVITY_USER_RESULTS]: [userResults] } as unknown as DashboardOutput,
      ])
      const req = { user: { id: 'teacher-1', role: UserRoles.teacher } } as IRequest

      const result = await controller.sessionResults(req, 'session-1')

      expect(result).toBe(userResults)
    })

    it('devrait autoriser le propriétaire de la session', async () => {
      const userResults = { id: 'user-1' } as UserResults
      service.ofSession.mockResolvedValue([
        { userId: 'user-1' } as SessionDataEntity,
        { [ACTIVITY_USER_RESULTS]: [userResults] } as unknown as DashboardOutput,
      ])
      const req = { user: { id: 'user-1', role: UserRoles.student } } as IRequest

      const result = await controller.sessionResults(req, 'session-1')

      expect(result).toBe(userResults)
    })
  })
})

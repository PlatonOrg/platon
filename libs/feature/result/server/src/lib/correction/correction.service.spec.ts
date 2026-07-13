import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { mockRepository, MockRepository } from '@platon/core/testing/server'
import { EventService } from '@platon/core/server'
import { CorrectionStatus } from '@platon/feature/result/common'
import { SessionEntity } from '../sessions/session.entity'
import { CorrectionEntity } from './correction.entity'
import { CorrectionService } from './correction.service'

describe('CorrectionService', () => {
  let service: CorrectionService
  let sessionRepository: { query: jest.Mock }
  let correctionRepository: MockRepository<CorrectionEntity>

  const baseProjection = {
    userId: 'user-1',
    activityId: 'activity-1',
    activityName: 'Activity 1',
    exerciseId: 'exercise-1',
    activitySessionId: 'activity-session-1',
    exerciseSessionId: 'exercise-session-1',
    courseId: 'course-1',
    courseName: 'Course 1',
    exerciseName: 'Exercise 1',
    hasUploads: false,
    labels: [],
  }

  beforeEach(async () => {
    sessionRepository = { query: jest.fn().mockResolvedValue([baseProjection]) }
    correctionRepository = mockRepository<CorrectionEntity>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrectionService,
        { provide: EventService, useValue: { emit: jest.fn() } },
        { provide: getRepositoryToken(SessionEntity), useValue: sessionRepository },
        { provide: getRepositoryToken(CorrectionEntity), useValue: correctionRepository },
      ],
    }).compile()

    service = module.get(CorrectionService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('list', () => {
    it('should LEFT JOIN answers (not INNER) so a session with zero submitted answers is still listed', async () => {
      await service.list('corrector-1')

      const [queryText] = sessionRepository.query.mock.calls[0]
      expect(queryText).toContain('LEFT JOIN LATERAL')
      expect(queryText).not.toContain('INNER JOIN LATERAL')
    })

    it('should keep sessions with no answer as long as the session itself recorded a grader error', async () => {
      await service.list('corrector-1')

      const [queryText] = sessionRepository.query.mock.calls[0]
      expect(queryText).toContain(
        `(answer.variables IS NOT NULL OR (exercise_session.variables->'.meta'->>'error')::boolean IS TRUE)`
      )
    })

    it('should not join or filter on answers at all in viewer mode', async () => {
      await service.list('corrector-1', undefined, true)

      const [queryText] = sessionRepository.query.mock.calls[0]
      expect(queryText).not.toContain('"Answers" a')
      expect(queryText).not.toContain('answer.variables')
    })

    it('should group exercises of the same activity together', async () => {
      sessionRepository.query.mockResolvedValue([
        baseProjection,
        { ...baseProjection, exerciseSessionId: 'exercise-session-2', userId: 'user-2' },
      ])

      const result = await service.list('corrector-1')

      expect(result).toHaveLength(1)
      expect(result[0].exercises).toHaveLength(2)
    })

    it('should only return activities with at least one uncorrected exercise when status=pending', async () => {
      sessionRepository.query.mockResolvedValue([
        { ...baseProjection, activityId: 'activity-pending', correctedBy: undefined },
        {
          ...baseProjection,
          activityId: 'activity-done',
          exerciseSessionId: 'exercise-session-2',
          correctedBy: 'teacher-1',
        },
      ])

      const result = await service.list('corrector-1', undefined, false, CorrectionStatus.pending)

      expect(result.map((activity) => activity.activityId)).toEqual(['activity-pending'])
    })

    it('should only return fully corrected activities when status=available', async () => {
      sessionRepository.query.mockResolvedValue([
        { ...baseProjection, activityId: 'activity-pending', correctedBy: undefined },
        {
          ...baseProjection,
          activityId: 'activity-done',
          exerciseSessionId: 'exercise-session-2',
          correctedBy: 'teacher-1',
        },
      ])

      const result = await service.list('corrector-1', undefined, false, CorrectionStatus.available)

      expect(result.map((activity) => activity.activityId)).toEqual(['activity-done'])
    })
  })
})

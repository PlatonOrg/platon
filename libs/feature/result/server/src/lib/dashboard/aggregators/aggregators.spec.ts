import { AnswerStates, answerStateFromGrade } from '@platon/feature/result/common'
import { SessionDataEntity } from '../../sessions/session-data.entity'
import { DEFAULT_GAP_DURATION, answerStateFromSession, sessionDurationInSeconds } from './aggregators'

describe('aggregators', () => {
  describe('sessionDurationInSeconds', () => {
    it('should return 0 if answers array is empty', () => {
      const input = {
        answers: [],
        startedAt: new Date(),
        lastGradedAt: new Date(),
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(0)
    })

    it('should return 0 if startedAt is not defined', () => {
      const input = {
        answers: [{ createdAt: new Date() }],
        startedAt: undefined,
        lastGradedAt: new Date(),
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(0)
    })

    it('should return 0 if lastGradedAt is not defined', () => {
      const input = {
        answers: [{ createdAt: new Date() }],
        startedAt: new Date(),
        lastGradedAt: undefined,
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(0)
    })

    it('should calculate the correct duration when answers array has one element', () => {
      const startedAt = new Date(2023, 0, 1, 10, 0, 0)
      const lastGradedAt = new Date(2023, 0, 1, 10, 0, 10)
      const input = {
        parentId: 'activityId',
        answers: [{ createdAt: new Date(2023, 0, 1, 10, 0, 5) }],
        startedAt,
        lastGradedAt,
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(5)
    })

    it('should calculate the correct duration when answers array has multiple elements', () => {
      const startedAt = new Date(2023, 0, 1, 10, 0, 0)
      const lastGradedAt = new Date(2023, 0, 1, 10, 0, 20)
      const input = {
        parentId: 'activityId',
        answers: [
          { createdAt: new Date(2023, 0, 1, 10, 0, 5) },
          { createdAt: new Date(2023, 0, 1, 10, 0, 10) },
          { createdAt: new Date(2023, 0, 1, 10, 0, 15) },
        ],
        startedAt,
        lastGradedAt,
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(15)
    })

    it('should handle activity session correctly', () => {
      const startedAt = new Date(2023, 0, 1, 10, 0, 0)
      const lastGradedAt = new Date(2023, 0, 1, 10, 0, 20)
      const input = {
        startedAt,
        lastGradedAt,
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(20)
    })

    it('should handle MAX_GAP_DURATION correctly', () => {
      const startedAt = new Date(2023, 0, 1, 10, 0, 0)
      const lastGradedAt = new Date(2023, 0, 1, 10, 0, 30)
      const input = {
        parentId: 'activityId',
        answers: [
          { createdAt: new Date(2023, 0, 1, 10, 0, 5) },
          { createdAt: new Date(2023, 0, 1, 10, 0, 10) },
          { createdAt: new Date(2023, 0, 2, 10, 0, 30) },
        ],
        startedAt,
        lastGradedAt,
      } as unknown as SessionDataEntity

      const result = sessionDurationInSeconds(input)

      expect(result).toBe(10 + DEFAULT_GAP_DURATION)
    })
  })

  describe('answerStateFromSession', () => {
    it('should return AnswerStates.STARTED if session has startedAt and no attempts', () => {
      const session = {
        startedAt: new Date(),
        attempts: 0,
      } as unknown as SessionDataEntity

      const result = answerStateFromSession(session)

      expect(result).toBe(AnswerStates.STARTED)
    })

    it('should return AnswerStates.NOT_STARTED if session does not have startedAt', () => {
      const session = {
        attempts: 0,
      } as unknown as SessionDataEntity

      const result = answerStateFromSession(session)

      expect(result).toBe(AnswerStates.NOT_STARTED)
    })

    it('should return the correct answer state when session has correctionGrade', () => {
      const session = {
        startedAt: new Date(),
        attempts: 1,
        grade: 50,
        correctionGrade: 100,
      } as unknown as SessionDataEntity

      const result = answerStateFromSession(session)

      expect(result).toBe(answerStateFromGrade(100))
    })

    it('should return the correct answer state when session has grade', () => {
      const session = {
        startedAt: new Date(),
        attempts: 1,
        grade: 50,
      } as unknown as SessionDataEntity

      const result = answerStateFromSession(session)
      expect(result).toBe(answerStateFromGrade(50))
    })

    it('should return AnswerStates.ERROR when the exercise crashed before any attempt (zero attempts)', () => {
      const session = {
        startedAt: new Date(),
        attempts: 0,
        grade: -1,
        exerciseMeta: { error: true },
      } as unknown as SessionDataEntity

      const result = answerStateFromSession(session)

      expect(result).toBe(AnswerStates.ERROR)
    })

    it('should return AnswerStates.ERROR even when a previous attempt succeeded (grade masks the crash)', () => {
      // session.grade is the best grade across attempts, so a later crashed attempt would otherwise
      // be hidden behind an earlier SUCCEEDED grade if we relied on grade/correctionGrade alone.
      const session = {
        startedAt: new Date(),
        attempts: 2,
        grade: 100,
        exerciseMeta: { error: true },
      } as unknown as SessionDataEntity

      const result = answerStateFromSession(session)

      expect(result).toBe(AnswerStates.ERROR)
    })

    it('should not report AnswerStates.ERROR when exerciseMeta.error is false or missing', () => {
      const withExplicitFalse = {
        startedAt: new Date(),
        attempts: 1,
        grade: 100,
        exerciseMeta: { error: false },
      } as unknown as SessionDataEntity

      const withoutExerciseMeta = {
        startedAt: new Date(),
        attempts: 1,
        grade: 100,
      } as unknown as SessionDataEntity

      expect(answerStateFromSession(withExplicitFalse)).toBe(AnswerStates.SUCCEEDED)
      expect(answerStateFromSession(withoutExerciseMeta)).toBe(AnswerStates.SUCCEEDED)
    })
  })
})

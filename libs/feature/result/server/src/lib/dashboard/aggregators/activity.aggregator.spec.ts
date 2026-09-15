import { AnswerStates } from '@platon/feature/result/common'
import { SessionDataEntity } from '../../sessions/session-data.entity'
import {
  ActivityAnswerRate,
  ActivityDistribution,
  ActivityDropoutRate,
  ActivityExerciseResults,
  ActivityTotalAttempts,
  ActivityTotalCompletions,
  ActivityUserResults,
} from './activity.aggregator'

describe('ActivityAggregators', () => {
  describe('ActivityAnswerRate', () => {
    let aggregator: ActivityAnswerRate

    beforeEach(() => {
      aggregator = new ActivityAnswerRate()
    })

    it("devrait ignorer les sessions d'exercice (avec parentId)", () => {
      aggregator.next({ parentId: 'p1' } as SessionDataEntity)

      expect(aggregator.complete()).toBe(0)
    })

    it('devrait retourner 0 sans aucune session', () => {
      expect(aggregator.complete()).toBe(0)
    })

    it('devrait calculer le pourcentage de sessions ayant au moins une réponse', () => {
      aggregator.next({
        activityNavigation: { exercises: [{ state: AnswerStates.NOT_STARTED }] },
      } as never)
      aggregator.next({
        activityNavigation: { exercises: [{ state: AnswerStates.STARTED }] },
      } as never)

      expect(aggregator.complete()).toBe(50)
    })
  })

  describe('ActivityDropoutRate', () => {
    let aggregator: ActivityDropoutRate

    beforeEach(() => {
      aggregator = new ActivityDropoutRate()
    })

    it("devrait ignorer les sessions d'exercice", () => {
      aggregator.next({ parentId: 'p1' } as SessionDataEntity)

      expect(aggregator.complete()).toBe(0)
    })

    it('devrait compter comme abandon si au moins un exercice reste non démarré/démarré', () => {
      aggregator.next({
        activityNavigation: { exercises: [{ state: AnswerStates.NOT_STARTED }] },
      } as never)
      aggregator.next({
        activityNavigation: { exercises: [{ state: AnswerStates.SUCCEEDED }] },
      } as never)

      expect(aggregator.complete()).toBe(50)
    })
  })

  describe('ActivityTotalAttempts', () => {
    it("devrait compter les sessions d'activité avec au moins une tentative", () => {
      const aggregator = new ActivityTotalAttempts()

      aggregator.next({ attempts: 1 } as SessionDataEntity)
      aggregator.next({ attempts: 0 } as SessionDataEntity)
      aggregator.next({ parentId: 'p1', attempts: 5 } as SessionDataEntity)

      expect(aggregator.complete()).toBe(1)
    })
  })

  describe('ActivityTotalCompletions', () => {
    it('devrait compter les sessions où tous les exercices ont été démarrés', () => {
      const aggregator = new ActivityTotalCompletions()

      aggregator.next({
        activityNavigation: { exercises: [{ state: AnswerStates.SUCCEEDED }, { state: AnswerStates.ANSWERED }] },
      } as never)
      aggregator.next({
        activityNavigation: { exercises: [{ state: AnswerStates.SUCCEEDED }, { state: AnswerStates.NOT_STARTED }] },
      } as never)

      expect(aggregator.complete()).toBe(1)
    })
  })

  describe('ActivityUserResults', () => {
    it("devrait pré-remplir les résultats à partir des membres de l'activité", () => {
      const aggregator = new ActivityUserResults({
        activityMembers: [
          { id: 'u1', username: 'alice', email: 'a@test.local', firstName: 'A', lastName: 'A' },
        ] as never,
        exerciseSessions: [],
      })

      const results = aggregator.complete()

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('u1')
    })

    it("devrait fusionner les résultats d'exercice dans le userResult correspondant", () => {
      const exerciseSession = {
        id: 'exercise-session-1',
        userId: 'u1',
        user: { id: 'u1', username: 'alice', email: 'a@test.local', firstName: 'A', lastName: 'A' },
        correctionGrade: undefined,
        grade: 80,
        attempts: 2,
        startedAt: new Date(),
        parentId: 'activity-session-1',
      } as unknown as SessionDataEntity

      const aggregator = new ActivityUserResults({
        exerciseSessions: [exerciseSession],
      })

      aggregator.next({
        id: 'activity-session-1',
        parentId: undefined,
        activityNavigation: { exercises: [{ id: 'ex-1', sessionId: 'exercise-session-1', title: 'Ex 1' }] },
      } as never)

      const results = aggregator.complete()

      expect(results[0].exercises['ex-1'].grade).toBe(80)
      expect(results[0].exercises['ex-1'].attempts).toBe(2)
    })

    it("devrait geler la note à -1 et l'état ANSWERED pour les résultats en cours de correction", () => {
      const exerciseSession = {
        id: 'exercise-session-1',
        userId: 'u1',
        user: { id: 'u1', username: 'alice', email: 'a@test.local', firstName: 'A', lastName: 'A' },
        correctionEnabled: true,
        correctionId: undefined,
        grade: 50,
        attempts: 1,
        startedAt: new Date(),
        parentId: 'activity-session-1',
      } as unknown as SessionDataEntity

      const aggregator = new ActivityUserResults({
        exerciseSessions: [exerciseSession],
      })

      aggregator.next({
        id: 'activity-session-1',
        activityNavigation: { exercises: [{ id: 'ex-1', sessionId: 'exercise-session-1' }] },
      } as never)

      const results = aggregator.complete()

      expect(results[0].correcting).toBe(true)
      expect(results[0].exercises['ex-1'].grade).toBe(-1)
      expect(results[0].exercises['ex-1'].state).toBe(AnswerStates.ANSWERED)
    })

    it("devrait ignorer les sessions d'exercice passées directement à next()", () => {
      const aggregator = new ActivityUserResults({ exerciseSessions: [] })

      expect(() => aggregator.next({ parentId: 'activity-session-1' } as SessionDataEntity)).not.toThrow()
      expect(aggregator.complete()).toEqual([])
    })
  })

  describe('ActivityExerciseResults', () => {
    it('devrait agréger les métriques par exercice', () => {
      const startedAt = new Date('2024-01-01T00:00:00Z')
      const exerciseSession = {
        id: 'exercise-session-1',
        resourceName: 'Exercise 1',
        grade: 100,
        attempts: 1,
        startedAt,
        lastGradedAt: new Date('2024-01-01T00:05:00Z'),
        answers: [{ createdAt: new Date('2024-01-01T00:01:00Z'), grade: 100 }],
        parentId: 'activity-session-1',
      } as unknown as SessionDataEntity

      const aggregator = new ActivityExerciseResults({ exerciseSessions: [exerciseSession] })

      aggregator.next({
        id: 'activity-session-1',
        activityNavigation: { exercises: [{ id: 'ex-1', sessionId: 'exercise-session-1' }] },
      } as never)

      const results = aggregator.complete()

      expect(results).toHaveLength(1)
      expect(results[0].grades.sum).toBe(100)
      expect(results[0].successRate.sum).toBe(1)
    })

    it("devrait ignorer les exercices dont la session n'est pas trouvée", () => {
      const aggregator = new ActivityExerciseResults({ exerciseSessions: [] })

      aggregator.next({
        activityNavigation: { exercises: [{ id: 'ex-1', sessionId: 'unknown-session' }] },
      } as never)

      expect(aggregator.complete()).toEqual([])
    })
  })

  describe('ActivityDistribution', () => {
    it('devrait regrouper les réussites par date pour chaque membre', () => {
      const aggregator = new ActivityDistribution({
        activityMembers: [{ id: 'u1', username: 'alice', firstName: 'A', lastName: 'A' }] as never,
        exerciseSessions: [],
      })

      aggregator.next({
        user: { id: 'u1' },
        resourceId: 'res-1',
        resourceName: 'Exercise 1',
        grade: 100,
        answers: [{ createdAt: new Date('2024-01-01T00:00:00Z'), grade: 100 }],
      } as never)

      const results = aggregator.complete()

      expect(results[0].nbSuccess['2024-01-01']).toBe(1)
    })

    it('ne devrait rien faire pour un utilisateur non pré-enregistré', () => {
      const aggregator = new ActivityDistribution({ activityMembers: [], exerciseSessions: [] })

      expect(() => aggregator.next({ user: { id: 'unknown' }, answers: [] } as never)).not.toThrow()
      expect(aggregator.complete()).toEqual([])
    })
  })
})

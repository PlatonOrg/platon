/**
 * Tests de non-régression : progression d'un cours PlatonClass (leçons, TP notés), branche feature/open-class.
 * `it.failing` = défaut relevé par l'audit (AUD-xx), à passer en `it` une fois corrigé.
 */
import { ExpandContext } from '@cisstech/nestjs-expand'
import { IRequest } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityKind } from '@platon/feature/course/common'
import { ActivityEntity, CourseDTO, CourseMemberService, LessonProgressService } from '@platon/feature/course/server'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { SessionEntity } from '../sessions/session.entity'
import { CourseExpander } from './course.expander'

const graded = { security: { terminateOnLeavePage: true, terminateOnLoseFocus: true } }

const act = (id: string, kind: ActivityKind, patch: Record<string, unknown> = {}) =>
  ({ id, courseId: 'course-1', isChallenge: false, kind, source: { variables: { settings: {} } }, ...patch }) as never

const session = (activity: unknown, done: number, total: number) =>
  ({
    activity,
    variables: {
      navigation: {
        exercises: Array.from({ length: total }, (_, i) => ({ state: i < done ? 'SUCCEEDED' : 'NOT_STARTED' })),
      },
    },
  }) as never

describe('CourseExpander — progression PlatonClass (non-régression)', () => {
  let activityRepository: MockRepository<ActivityEntity>
  let sessionRepository: MockRepository<SessionEntity>
  let lessonProgressService: { findCompletedActivityIds: jest.Mock }
  let expander: CourseExpander

  const context = {
    parent: { id: 'course-1' } as CourseDTO,
    request: { user: { id: 'student-1' } } as IRequest,
  } as ExpandContext<IRequest, CourseDTO>

  const givenActivities = (activities: unknown[]) => {
    const qb = mockSelectQueryBuilder<ActivityEntity>()
    qb.getMany.mockResolvedValue(activities as ActivityEntity[])
    activityRepository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ActivityEntity>)
    return qb
  }

  beforeEach(() => {
    activityRepository = mockRepository<ActivityEntity>()
    sessionRepository = mockRepository<SessionEntity>()
    sessionRepository.find.mockResolvedValue([])
    lessonProgressService = { findCompletedActivityIds: jest.fn().mockResolvedValue(new Set()) }
    expander = new CourseExpander(
      { findViewsByCourseIds: jest.fn().mockResolvedValue([]) } as unknown as CourseMemberService,
      lessonProgressService as unknown as LessonProgressService,
      activityRepository as unknown as Repository<ActivityEntity>,
      sessionRepository as unknown as Repository<SessionEntity>
    )
  })

  it('cours classique sans leçon : comportement historique (moyenne des sessions)', async () => {
    const ex = act('ex-1', ActivityKind.EXERCISE)
    givenActivities([ex, act('ex-2', ActivityKind.EXERCISE)])
    sessionRepository.find.mockResolvedValue([session(ex, 2, 2)])

    const result = await expander.statistic(context)

    expect(result.progression).toBe(50)
    expect(result.activityCount).toBe(2)
    expect(lessonProgressService.findCompletedActivityIds).not.toHaveBeenCalled()
  })

  it('une leçon terminée compte pour 100 %, une non terminée pour 0 %', async () => {
    givenActivities([act('l-1', ActivityKind.LESSON), act('l-2', ActivityKind.LESSON)])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['l-1']))

    const result = await expander.statistic(context)

    expect(result.progression).toBe(50)
    expect(lessonProgressService.findCompletedActivityIds).toHaveBeenCalledWith(['l-1', 'l-2'], 'student-1')
  })

  it('mélange leçons et exercices sur un même dénominateur', async () => {
    const ex = act('ex-1', ActivityKind.EXERCISE)
    givenActivities([act('l-1', ActivityKind.LESSON), ex])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['l-1']))
    sessionRepository.find.mockResolvedValue([session(ex, 1, 2)])

    const result = await expander.statistic(context)

    expect(result.progression).toBe(75)
  })

  it("un TP noté est exclu du numérateur et du dénominateur (le cours peut atteindre 100 %)", async () => {
    const tp = act('tp-1', ActivityKind.EXERCISE, { source: { variables: { settings: graded } } })
    givenActivities([act('l-1', ActivityKind.LESSON), tp])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['l-1']))
    sessionRepository.find.mockResolvedValue([session(tp, 0, 3)])

    const result = await expander.statistic(context)

    expect(result.progression).toBe(100)
    expect(result.activityCount).toBe(2)
  })

  it("un exercice avec une seule des deux options de surveillance n'est pas un TP noté", async () => {
    const half = act('ex-1', ActivityKind.EXERCISE, {
      source: { variables: { settings: { security: { terminateOnLeavePage: true } } } },
    })
    givenActivities([act('l-1', ActivityKind.LESSON), half])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['l-1']))

    const result = await expander.statistic(context)

    expect(result.progression).toBe(50)
  })

  it('un cours composé uniquement de TP notés ne divise pas par zéro', async () => {
    const tp = act('tp-1', ActivityKind.EXERCISE, { source: { variables: { settings: graded } } })
    givenActivities([tp])
    sessionRepository.find.mockResolvedValue([session(tp, 3, 3)])

    const result = await expander.statistic(context)

    expect(result.progression).toBe(0)
    expect(Number.isFinite(result.progression)).toBe(true)
  })

  // AUD-09 : les leçons en brouillon (invisibles pour l'étudiant) restent dans le dénominateur :
  // un étudiant qui a tout lu plafonne sous 100 % tant que l'enseignant garde un brouillon.
  // (La requête ne sélectionne même pas `activity.draft`.)
  it.failing("AUD-09 une leçon en brouillon n'empêche pas d'atteindre 100 %", async () => {
    givenActivities([act('l-1', ActivityKind.LESSON), act('l-2', ActivityKind.LESSON, { draft: true })])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['l-1']))

    const result = await expander.statistic(context)

    expect(result.progression).toBe(100)
  })

  // AUD-09 (suite) : une ligne de progression sur une leçon brouillon (cf. AUD-07) gonfle le numérateur.
  it.failing('AUD-09 une progression enregistrée sur un brouillon ne dépasse pas 100 %', async () => {
    givenActivities([act('l-1', ActivityKind.LESSON), act('l-2', ActivityKind.LESSON, { draft: true })])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['l-1', 'l-2']))

    const result = await expander.statistic(context)

    expect(lessonProgressService.findCompletedActivityIds).toHaveBeenCalledWith(['l-1'], 'student-1')
    expect(result.progression).toBe(100)
  })
})

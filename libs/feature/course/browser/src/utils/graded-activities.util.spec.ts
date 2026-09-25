import { Activity, ActivityKind, CourseSection } from '@platon/feature/course/common'
import { buildGradedActivities } from './graded-activities.util'

describe('buildGradedActivities', () => {
  const sectionA = { id: 'section-a', order: 1 } as CourseSection
  const sectionB = { id: 'section-b', order: 0 } as CourseSection

  const graded = (overrides: Partial<Activity> = {}): Activity =>
    ({
      id: 'graded-1',
      sectionId: 'section-a',
      order: 0,
      kind: ActivityKind.EXERCISE,
      activitySettings: { security: { terminateOnLeavePage: true, terminateOnLoseFocus: true } },
      ...overrides,
    } as Activity)

  it('exclut les leçons et les exercices non surveillés', () => {
    const lesson = { id: 'lesson-1', sectionId: 'section-a', kind: ActivityKind.LESSON } as Activity
    const exercise = { id: 'exercise-1', sectionId: 'section-a', kind: ActivityKind.EXERCISE } as Activity

    const result = buildGradedActivities([sectionA], [lesson, exercise])

    expect(result).toEqual([])
  })

  it("trie les TP notés par section (dans l'ordre du cours) puis par ordre dans la section", () => {
    const first = graded({ id: 'b-0', sectionId: 'section-b', order: 0 })
    const second = graded({ id: 'b-1', sectionId: 'section-b', order: 1 })
    const third = graded({ id: 'a-0', sectionId: 'section-a', order: 0 })

    // Volontairement désordonné en entrée pour vérifier le tri, sectionB (order 0) avant sectionA (order 1).
    const result = buildGradedActivities([sectionA, sectionB], [third, second, first])

    expect(result.map((item) => item.activity.id)).toEqual(['b-0', 'b-1', 'a-0'])
  })

  it('reporte la durée et le nombre de tentatives quand ils sont définis', () => {
    const activity = graded({
      activitySettings: {
        duration: 1800,
        actions: { retry: 3 },
        security: { terminateOnLeavePage: true, terminateOnLoseFocus: true },
      },
    })

    const [item] = buildGradedActivities([sectionA], [activity])

    expect(item.duration).toBe(1800)
    expect(item.attempts).toBe(3)
  })

  it('ne reporte ni durée ni tentatives quand elles valent 0 (illimité) ou sont absentes', () => {
    const unlimited = graded({
      id: 'unlimited',
      activitySettings: {
        duration: 0,
        actions: { retry: 0 },
        security: { terminateOnLeavePage: true, terminateOnLoseFocus: true },
      },
    })
    const undefinedValues = graded({ id: 'no-settings' })

    const result = buildGradedActivities([sectionA], [unlimited, undefinedValues])

    expect(result.every((item) => item.duration === undefined && item.attempts === undefined)).toBe(true)
  })
})

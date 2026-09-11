import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { IRequest } from '@platon/core/server'
import { ActivityKind } from '@platon/feature/course/common'
import { ActivityEntity, CourseDTO, CourseMemberService, LessonProgressService } from '@platon/feature/course/server'
import { SessionEntity } from '../sessions/session.entity'
import { CourseExpander } from './course.expander'

describe('CourseExpander', () => {
  let expander: CourseExpander
  let sessionRepository: { find: jest.Mock }
  let lessonProgressService: { findCompletedActivityIds: jest.Mock }
  let activityQueryBuilder: {
    leftJoin: jest.Mock
    select: jest.Mock
    where: jest.Mock
    andWhere: jest.Mock
    getMany: jest.Mock
  }

  const buildContext = (courseId: string): { request: IRequest; parent: CourseDTO } => ({
    request: { user: { id: 'user-1' } } as IRequest,
    parent: { id: courseId } as CourseDTO,
  })

  beforeEach(async () => {
    sessionRepository = { find: jest.fn().mockResolvedValue([]) }
    lessonProgressService = { findCompletedActivityIds: jest.fn().mockResolvedValue(new Set()) }
    activityQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseExpander,
        { provide: CourseMemberService, useValue: { findViewsByCourseIds: jest.fn().mockResolvedValue([]) } },
        { provide: LessonProgressService, useValue: lessonProgressService },
        {
          provide: getRepositoryToken(ActivityEntity),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(activityQueryBuilder) },
        },
        { provide: getRepositoryToken(SessionEntity), useValue: sessionRepository },
      ],
    }).compile()

    expander = module.get(CourseExpander)
  })

  it('ne compte pas les leçons dans le dénominateur sans compter leur complétion (moyenne correcte sur un cours mixte)', async () => {
    // 1 exercice complété (progression 100 via session) + 1 leçon complétée + 1 leçon non lue = 200/3 ≈ 67%
    activityQueryBuilder.getMany.mockResolvedValue([
      { id: 'exercise-1', kind: ActivityKind.EXERCISE, isChallenge: false },
      { id: 'lesson-1', kind: ActivityKind.LESSON, isChallenge: false },
      { id: 'lesson-2', kind: ActivityKind.LESSON, isChallenge: false },
    ])
    sessionRepository.find.mockResolvedValue([
      {
        activityId: 'exercise-1',
        lastGradedAt: new Date(),
        startedAt: new Date(),
        variables: { navigation: { exercises: [{ state: 'GRADED' }] } },
      },
    ])
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['lesson-1']))

    const result = await expander.statistic(buildContext('course-1'))

    expect(lessonProgressService.findCompletedActivityIds).toHaveBeenCalledWith(['lesson-1', 'lesson-2'], 'user-1')
    expect(result.activityCount).toBe(3)
    expect(result.progression).toBe(Math.round((100 + 100 + 0) / 3))
  })

  it("ne consulte pas le suivi de leçons quand le cours n'en contient aucune", async () => {
    activityQueryBuilder.getMany.mockResolvedValue([
      { id: 'exercise-1', kind: ActivityKind.EXERCISE, isChallenge: false },
    ])

    await expander.statistic(buildContext('course-1'))

    expect(lessonProgressService.findCompletedActivityIds).not.toHaveBeenCalled()
  })

  it('retourne 0% de progression pour un cours sans aucune activité', async () => {
    activityQueryBuilder.getMany.mockResolvedValue([])

    const result = await expander.statistic(buildContext('course-1'))

    expect(result.progression).toBe(0)
    expect(result.activityCount).toBe(0)
  })
})

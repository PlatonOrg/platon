import { ExpandContext } from '@cisstech/nestjs-expand'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { IRequest, UserEntity } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityKind } from '@platon/feature/course/common'
import { ActivityEntity, CourseDTO, CourseMemberService, LessonProgressService } from '@platon/feature/course/server'
import { SelectQueryBuilder } from 'typeorm'
import { SessionEntity } from '../sessions/session.entity'
import { CourseExpander } from './course.expander'

describe('CourseExpander', () => {
  let expander: CourseExpander
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'findViewsByCourseIds'>>
  let lessonProgressService: jest.Mocked<Pick<LessonProgressService, 'findCompletedActivityIds'>>
  let activityRepository: MockRepository<ActivityEntity>
  let sessionRepository: MockRepository<SessionEntity>

  beforeEach(async () => {
    courseMemberService = { findViewsByCourseIds: jest.fn() }
    lessonProgressService = { findCompletedActivityIds: jest.fn() }
    activityRepository = mockRepository<ActivityEntity>()
    sessionRepository = mockRepository<SessionEntity>()

    const module = await Test.createTestingModule({
      providers: [
        CourseExpander,
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: LessonProgressService, useValue: lessonProgressService },
        { provide: getRepositoryToken(ActivityEntity), useValue: activityRepository },
        { provide: getRepositoryToken(SessionEntity), useValue: sessionRepository },
      ],
    }).compile()

    expander = module.get(CourseExpander)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('devrait calculer les compteurs de membres et activités du cours', async () => {
    courseMemberService.findViewsByCourseIds.mockResolvedValue([
      { role: 'student' },
      { role: 'student' },
      { role: 'teacher' },
    ] as never)
    sessionRepository.find.mockResolvedValue([])
    const qb = mockSelectQueryBuilder<ActivityEntity>()
    qb.getMany.mockResolvedValue([{ isChallenge: true }, { isChallenge: false }] as ActivityEntity[])
    activityRepository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ActivityEntity>)

    const context = {
      parent: { id: 'course-1' } as CourseDTO,
      request: { user: { id: 'user-1' } as UserEntity } as IRequest,
    } as ExpandContext<IRequest, CourseDTO>

    const result = await expander.statistic(context)

    expect(result.studentCount).toBe(2)
    expect(result.teacherCount).toBe(1)
    expect(result.activityCount).toBe(2)
    expect(result.challengeCount).toBe(1)
  })

  it('devrait calculer le temps passé et la progression moyenne à partir des sessions', async () => {
    courseMemberService.findViewsByCourseIds.mockResolvedValue([])
    sessionRepository.find.mockResolvedValue([
      {
        startedAt: new Date('2024-01-01T00:00:00Z'),
        lastGradedAt: new Date('2024-01-01T00:05:00Z'),
        variables: { navigation: { exercises: [{ state: 'SUCCEEDED' }, { state: 'NOT_STARTED' }] } },
      },
    ] as unknown as SessionEntity[])
    const qb = mockSelectQueryBuilder<ActivityEntity>()
    qb.getMany.mockResolvedValue([{ isChallenge: false }] as ActivityEntity[])
    activityRepository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ActivityEntity>)

    const context = {
      parent: { id: 'course-1' } as CourseDTO,
      request: { user: { id: 'user-1' } as UserEntity } as IRequest,
    } as ExpandContext<IRequest, CourseDTO>

    const result = await expander.statistic(context)

    expect(result.timeSpent).toBe(300)
    expect(result.progression).toBe(50)
  })

  it("devrait ajouter la progression des leçons complétées, distinctement des sessions d'exercice", async () => {
    courseMemberService.findViewsByCourseIds.mockResolvedValue([])
    sessionRepository.find.mockResolvedValue([])
    const qb = mockSelectQueryBuilder<ActivityEntity>()
    qb.getMany.mockResolvedValue([
      { id: 'lesson-1', isChallenge: false, kind: ActivityKind.LESSON },
      { id: 'lesson-2', isChallenge: false, kind: ActivityKind.LESSON },
    ] as ActivityEntity[])
    activityRepository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ActivityEntity>)
    lessonProgressService.findCompletedActivityIds.mockResolvedValue(new Set(['lesson-1']))

    const context = {
      parent: { id: 'course-1' } as CourseDTO,
      request: { user: { id: 'user-1' } as UserEntity } as IRequest,
    } as ExpandContext<IRequest, CourseDTO>

    const result = await expander.statistic(context)

    expect(lessonProgressService.findCompletedActivityIds).toHaveBeenCalledWith(['lesson-1', 'lesson-2'], 'user-1')
    expect(result.progression).toBe(50)
  })

  it('ne devrait pas appeler LessonProgressService sans activité de type leçon', async () => {
    courseMemberService.findViewsByCourseIds.mockResolvedValue([])
    sessionRepository.find.mockResolvedValue([])
    const qb = mockSelectQueryBuilder<ActivityEntity>()
    qb.getMany.mockResolvedValue([{ isChallenge: false, kind: ActivityKind.EXERCISE }] as ActivityEntity[])
    activityRepository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ActivityEntity>)

    const context = {
      parent: { id: 'course-1' } as CourseDTO,
      request: { user: { id: 'user-1' } as UserEntity } as IRequest,
    } as ExpandContext<IRequest, CourseDTO>

    await expander.statistic(context)

    expect(lessonProgressService.findCompletedActivityIds).not.toHaveBeenCalled()
  })

  it('devrait retourner une progression à 0 sans session valorisée', async () => {
    courseMemberService.findViewsByCourseIds.mockResolvedValue([])
    sessionRepository.find.mockResolvedValue([])
    const qb = mockSelectQueryBuilder<ActivityEntity>()
    qb.getMany.mockResolvedValue([] as ActivityEntity[])
    activityRepository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ActivityEntity>)

    const context = {
      parent: { id: 'course-1' } as CourseDTO,
      request: { user: { id: 'user-1' } as UserEntity } as IRequest,
    } as ExpandContext<IRequest, CourseDTO>

    const result = await expander.statistic(context)

    expect(result.progression).toBe(0)
  })
})

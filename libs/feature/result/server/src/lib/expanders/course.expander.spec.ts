import { ExpandContext } from '@cisstech/nestjs-expand'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { IRequest, UserEntity } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityEntity, CourseDTO, CourseMemberService } from '@platon/feature/course/server'
import { SelectQueryBuilder } from 'typeorm'
import { SessionEntity } from '../sessions/session.entity'
import { CourseExpander } from './course.expander'

describe('CourseExpander', () => {
  let expander: CourseExpander
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'findViewsByCourseIds'>>
  let activityRepository: MockRepository<ActivityEntity>
  let sessionRepository: MockRepository<SessionEntity>

  beforeEach(async () => {
    courseMemberService = { findViewsByCourseIds: jest.fn() }
    activityRepository = mockRepository<ActivityEntity>()
    sessionRepository = mockRepository<SessionEntity>()

    const module = await Test.createTestingModule({
      providers: [
        CourseExpander,
        { provide: CourseMemberService, useValue: courseMemberService },
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

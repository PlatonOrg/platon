import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestResponse, NotFoundResponse, UserRoles } from '@platon/core/common'
import { UserEntity } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityEntity, ActivityMemberView, CourseMemberView } from '@platon/feature/course/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { ResourceEntity, ResourceService } from '@platon/feature/resource/server'
import { USER_ACTIVITY_COUNT, USER_COURSE_COUNT } from '@platon/feature/result/common'
import { Optional } from 'typescript-optional'
import { SelectQueryBuilder } from 'typeorm'
import { SessionDataEntity } from '../sessions/session-data.entity'
import { DashboardService } from './dashboard.service'

describe('DashboardService', () => {
  let service: DashboardService
  let resourceService: jest.Mocked<Pick<ResourceService, 'findByIdOrCode'>>
  let sessionData: MockRepository<SessionDataEntity>
  let courseMemberView: MockRepository<CourseMemberView>
  let activityRepository: MockRepository<ActivityEntity>
  let activityMemberView: MockRepository<ActivityMemberView>

  beforeEach(async () => {
    resourceService = { findByIdOrCode: jest.fn() }
    sessionData = mockRepository<SessionDataEntity>()
    courseMemberView = mockRepository<CourseMemberView>()
    activityRepository = mockRepository<ActivityEntity>()
    activityMemberView = mockRepository<ActivityMemberView>()

    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: ResourceService, useValue: resourceService },
        { provide: getRepositoryToken(SessionDataEntity), useValue: sessionData },
        { provide: getRepositoryToken(CourseMemberView), useValue: courseMemberView },
        { provide: getRepositoryToken(ActivityEntity), useValue: activityRepository },
        { provide: getRepositoryToken(ActivityMemberView), useValue: activityMemberView },
      ],
    }).compile()

    service = module.get(DashboardService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ofUser', () => {
    it("devrait retourner uniquement la section 'user' pour un étudiant", async () => {
      courseMemberView.find.mockResolvedValue([{ id: 'course-1' } as CourseMemberView])
      activityMemberView.find.mockResolvedValue([])
      sessionData.find.mockResolvedValue([])

      const output = await service.ofUser({ id: 'user-1', role: UserRoles.student } as UserEntity)

      expect(output['user']).toBeDefined()
      expect(output[UserRoles.student]).toBeUndefined()
      const userOutput = output['user'] as Record<string, unknown>
      expect(userOutput[USER_COURSE_COUNT]).toBe(1)
      expect(userOutput[USER_ACTIVITY_COUNT]).toBe(0)
    })

    it("devrait aussi retourner la section 'student' pour un enseignant", async () => {
      courseMemberView.find.mockResolvedValue([])
      activityMemberView.find.mockResolvedValue([{ activityId: 'activity-1' } as ActivityMemberView])
      sessionData.find.mockResolvedValue([])

      const output = await service.ofUser({ id: 'teacher-1', role: UserRoles.teacher } as UserEntity)

      expect(output[UserRoles.student]).toBeDefined()
    })
  })

  describe('ofSession', () => {
    it("devrait lever une NotFoundResponse si la session n'existe pas", async () => {
      sessionData.findOne.mockResolvedValue(null)

      await expect(service.ofSession('session-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait lever une BadRequestResponse si la session n'est pas une session d'activité", async () => {
      sessionData.findOne.mockResolvedValue({ id: 'session-1', parentId: 'parent-1' } as SessionDataEntity)

      await expect(service.ofSession('session-1')).rejects.toBeInstanceOf(BadRequestResponse)
    })

    it('devrait retourner la session et les résultats agrégés', async () => {
      sessionData.findOne.mockResolvedValue({ id: 'session-1', activityId: 'activity-1' } as SessionDataEntity)
      activityRepository.findOne.mockResolvedValue({
        id: 'activity-1',
        source: { variables: {} },
      } as unknown as ActivityEntity)
      sessionData.find.mockResolvedValue([])

      const [session, output] = await service.ofSession('session-1')

      expect(session.id).toBe('session-1')
      expect(output).toBeDefined()
    })
  })

  describe('ofResource', () => {
    it("devrait lever une NotFoundResponse si la ressource n'existe pas", async () => {
      resourceService.findByIdOrCode.mockResolvedValue(Optional.empty())

      await expect(service.ofResource('res-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait agréger les sessions d'exercice pour une ressource EXERCISE", async () => {
      resourceService.findByIdOrCode.mockResolvedValue(
        Optional.of({ id: 'res-1', type: ResourceTypes.EXERCISE } as ResourceEntity)
      )
      sessionData.find.mockResolvedValue([])

      const output = await service.ofResource('res-1')

      expect(sessionData.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ resourceId: 'res-1' }) })
      )
      expect(output).toBeDefined()
    })

    it("devrait agréger les sessions d'activité et les usages pour une ressource ACTIVITY", async () => {
      resourceService.findByIdOrCode.mockResolvedValue(
        Optional.of({ id: 'res-1', type: ResourceTypes.ACTIVITY } as ResourceEntity)
      )
      sessionData.find.mockResolvedValueOnce([]).mockResolvedValueOnce([])
      activityRepository.find.mockResolvedValue([{ courseId: 'course-1' } as ActivityEntity])

      const output = await service.ofResource('res-1')

      expect(output['activity.course.usedIn.count']).toBeUndefined()
    })
  })

  describe('ofActivity', () => {
    it("devrait lever une NotFoundResponse si l'activité n'existe pas", async () => {
      activityRepository.findOne.mockResolvedValue(null)

      await expect(service.ofActivity('activity-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait agréger les sessions de l'activité", async () => {
      activityRepository.findOne.mockResolvedValue({
        id: 'activity-1',
        courseId: 'course-1',
        source: { variables: {} },
      } as unknown as ActivityEntity)
      sessionData.find.mockResolvedValue([])
      activityMemberView.find.mockResolvedValue([])

      const output = await service.ofActivity('activity-1')

      expect(output).toBeDefined()
    })
  })

  describe('ofActivityForDate', () => {
    it("devrait lever une NotFoundResponse si l'activité n'existe pas", async () => {
      activityRepository.findOne.mockResolvedValue(null)

      await expect(service.ofActivityForDate('activity-1', new Date(), new Date())).rejects.toBeInstanceOf(
        NotFoundResponse
      )
    })

    it('devrait retourner la distribution agrégée', async () => {
      activityRepository.findOne.mockResolvedValue({ id: 'activity-1', courseId: 'course-1' } as ActivityEntity)
      const qb = mockSelectQueryBuilder<SessionDataEntity>()
      qb.getMany.mockResolvedValue([])
      sessionData.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<SessionDataEntity>)
      activityMemberView.find.mockResolvedValue([])

      const result = await service.ofActivityForDate('activity-1', new Date('2024-01-01'), new Date('2024-01-31'))

      expect(result).toEqual([])
    })
  })
})

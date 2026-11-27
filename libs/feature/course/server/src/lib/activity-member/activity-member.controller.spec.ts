import { Test } from '@nestjs/testing'
import { ForbiddenResponse, NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { Optional } from 'typescript-optional'
import { ActivityEntity } from '../activity/activity.entity'
import { ActivityService } from '../activity/activity.service'
import { CourseMemberService } from '../course-member/course-member.service'
import { ActivityMemberController } from './activity-member.controller'
import { ActivityMemberEntity } from './activity-member.entity'
import { ActivityMemberService } from './activity-member.service'

describe('ActivityMemberController', () => {
  let controller: ActivityMemberController
  let activityService: jest.Mocked<Pick<ActivityService, 'withActivity'>>
  let memberService: jest.Mocked<Pick<ActivityMemberService, 'search' | 'create' | 'update' | 'delete' | 'findById'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'hasWritePermission'>>
  const req = { user: { id: 'teacher-1' } } as IRequest

  const withActivityMock = (activity: Partial<ActivityEntity> | null) =>
    jest.fn(async (_id: string, consumer: (a: ActivityEntity | null) => void | Promise<void>) => {
      await consumer(activity as ActivityEntity)
    })

  beforeEach(async () => {
    activityService = { withActivity: jest.fn() }
    memberService = { search: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findById: jest.fn() }
    courseMemberService = { hasWritePermission: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ActivityMemberController,
        { provide: ActivityService, useValue: activityService },
        { provide: ActivityMemberService, useValue: memberService },
        { provide: CourseMemberService, useValue: courseMemberService },
      ],
    }).compile()

    controller = module.get(ActivityMemberController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('search', () => {
    it('devrait retourner la liste mappée', async () => {
      memberService.search.mockResolvedValue([[{ id: 'm1' } as ActivityMemberEntity], 1])

      const result = await controller.search('activity-1')

      expect(result.total).toBe(1)
    })
  })

  describe('create', () => {
    it("devrait lever une NotFoundResponse si l'activité n'existe pas", async () => {
      activityService.withActivity.mockImplementation(withActivityMock(null))

      await expect(controller.create(req, 'activity-1', {} as never)).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait lever une ForbiddenResponse pour un challenge', async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ isChallenge: true }))

      await expect(controller.create(req, 'activity-1', {} as never)).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it("devrait lever une ForbiddenResponse sans permission d'écriture", async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ isChallenge: false, courseId: 'course-1' }))
      courseMemberService.hasWritePermission.mockResolvedValue(false)

      await expect(controller.create(req, 'activity-1', {} as never)).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('devrait créer le membre', async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ isChallenge: false, courseId: 'course-1' }))
      courseMemberService.hasWritePermission.mockResolvedValue(true)
      memberService.create.mockResolvedValue({ id: 'm1' } as ActivityMemberEntity)
      memberService.findById.mockResolvedValue(Optional.of({ id: 'm1' } as ActivityMemberEntity))

      const result = await controller.create(req, 'activity-1', {} as never)

      expect(result.resource.id).toBe('m1')
    })
  })

  describe('update', () => {
    it('devrait mettre à jour et retourner la nouvelle liste', async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ isChallenge: false, courseId: 'course-1' }))
      courseMemberService.hasWritePermission.mockResolvedValue(true)
      memberService.search.mockResolvedValue([[], 0])

      await controller.update(req, 'activity-1', [])

      expect(memberService.update).toHaveBeenCalledWith('activity-1', [])
    })
  })

  describe('delete', () => {
    it('devrait supprimer le membre', async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ isChallenge: false, courseId: 'course-1' }))
      courseMemberService.hasWritePermission.mockResolvedValue(true)

      await controller.delete(req, 'activity-1', 'm1')

      expect(memberService.delete).toHaveBeenCalledWith('activity-1', 'm1')
    })
  })
})

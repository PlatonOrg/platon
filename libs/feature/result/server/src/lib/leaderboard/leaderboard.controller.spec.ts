import { Test } from '@nestjs/testing'
import { ForbiddenResponse, UserRoles } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { ActivityGroupService, ActivityMemberService, CourseMemberService } from '@platon/feature/course/server'
import { ActivityLeaderboardEntry, CourseLeaderboardEntry } from '@platon/feature/result/common'
import { LeaderboardController } from './leaderboard.controller'
import { LeaderboardService } from './leaderboard.service'

describe('LeaderboardController', () => {
  let controller: LeaderboardController
  let service: jest.Mocked<Pick<LeaderboardService, 'ofCourse' | 'ofActivity'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'isMember'>>
  let activityMemberService: jest.Mocked<Pick<ActivityMemberService, 'isMember' | 'isPrivateMember'>>
  let activityGroupService: jest.Mocked<Pick<ActivityGroupService, 'isUserInActivityGroup' | 'numberOfGroups'>>

  beforeEach(async () => {
    service = { ofCourse: jest.fn(), ofActivity: jest.fn() }
    courseMemberService = { isMember: jest.fn() }
    activityMemberService = { isMember: jest.fn(), isPrivateMember: jest.fn() }
    activityGroupService = { isUserInActivityGroup: jest.fn(), numberOfGroups: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        LeaderboardController,
        { provide: LeaderboardService, useValue: service },
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: ActivityMemberService, useValue: activityMemberService },
        { provide: ActivityGroupService, useValue: activityGroupService },
      ],
    }).compile()

    controller = module.get(LeaderboardController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ofCourse', () => {
    it("devrait lever une ForbiddenResponse si l'utilisateur n'est pas membre du cours", async () => {
      courseMemberService.isMember.mockResolvedValue(false)
      const req = { user: { id: 'user-1' } } as IRequest

      await expect(controller.ofCourse(req, 'course-1')).rejects.toBeInstanceOf(ForbiddenResponse)
      expect(service.ofCourse).not.toHaveBeenCalled()
    })

    it('devrait retourner le classement pour un membre du cours', async () => {
      courseMemberService.isMember.mockResolvedValue(true)
      service.ofCourse.mockResolvedValue([{ rank: 1, points: 10 } as unknown as CourseLeaderboardEntry])
      const req = { user: { id: 'user-1' } } as IRequest

      const result = await controller.ofCourse(req, 'course-1', 50)

      expect(service.ofCourse).toHaveBeenCalledWith('course-1', 50)
      expect(result.total).toBe(1)
    })
  })

  describe('ofActivity', () => {
    it('devrait autoriser un enseignant sans autre vérification', async () => {
      service.ofActivity.mockResolvedValue([])
      const req = { user: { id: 'teacher-1', role: UserRoles.teacher } } as IRequest

      await controller.ofActivity(req, 'activity-1')

      expect(activityMemberService.isPrivateMember).toHaveBeenCalled()
      expect(service.ofActivity).toHaveBeenCalledWith('activity-1', undefined)
    })

    it('devrait lever une ForbiddenResponse pour un étudiant non membre', async () => {
      activityMemberService.isPrivateMember.mockResolvedValue(false)
      activityGroupService.isUserInActivityGroup.mockResolvedValue(false)
      activityMemberService.isMember.mockResolvedValue(false)
      activityGroupService.numberOfGroups.mockResolvedValue(0)
      const req = { user: { id: 'student-1', role: UserRoles.student } } as IRequest

      await expect(controller.ofActivity(req, 'activity-1')).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('devrait autoriser un membre privé même étudiant', async () => {
      activityMemberService.isPrivateMember.mockResolvedValue(true)
      activityGroupService.isUserInActivityGroup.mockResolvedValue(false)
      activityMemberService.isMember.mockResolvedValue(false)
      activityGroupService.numberOfGroups.mockResolvedValue(0)
      service.ofActivity.mockResolvedValue([{ rank: 1 } as unknown as ActivityLeaderboardEntry])
      const req = { user: { id: 'student-1', role: UserRoles.student } } as IRequest

      const result = await controller.ofActivity(req, 'activity-1')

      expect(result.total).toBe(1)
    })

    it('devrait autoriser un membre standard sans groupe sur une activité sans groupes', async () => {
      activityMemberService.isPrivateMember.mockResolvedValue(false)
      activityGroupService.isUserInActivityGroup.mockResolvedValue(false)
      activityMemberService.isMember.mockResolvedValue(true)
      activityGroupService.numberOfGroups.mockResolvedValue(0)
      service.ofActivity.mockResolvedValue([])
      const req = { user: { id: 'student-1', role: UserRoles.student } } as IRequest

      await controller.ofActivity(req, 'activity-1')

      expect(service.ofActivity).toHaveBeenCalledWith('activity-1', undefined)
    })
  })
})

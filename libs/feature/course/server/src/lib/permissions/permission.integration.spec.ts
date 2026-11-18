import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { Optional } from 'typescript-optional'
import { CLS_REQ } from 'nestjs-cls'

import { ActivityGroupService } from '../activity-group/activity-group.service'
import { ActivityMemberService } from '../activity-member/activity-member.service'
import { ActivityEntity } from '../activity/activity.entity'
import { ActivityService } from '../activity/activity.service'
import { ActivityDatesService } from '../activity/activity-dates.service'
import { CourseMemberService } from '../course-member/course-member.service'
import { CourseGroupService } from '../course-group/course-group.service'
import { CoursePermissionsService } from './permissions.service'

import { RestrictionList } from '@platon/feature/course/common'

const NOW = new Date('2026-02-15T12:00:00.000Z')
const START = new Date('2026-01-23T08:00:00.000Z')
const END = new Date('2026-06-23T18:00:00.000Z')

const req = { user: { id: 'user-1', role: 'student' } } as IRequest

const period = (...restrictions: RestrictionList['restriction']): RestrictionList => ({
  restriction: restrictions,
})

const makeActivity = (restrictions: RestrictionList[]): ActivityEntity =>
  ({
    id: 'activity-1',
    courseId: 'course-1',
    creatorId: 'another-user',
    ignoreRestrictions: false,
    restrictions,
    openAt: undefined,
    closeAt: undefined,
  } as unknown as ActivityEntity)

const makeMember = (id: string) => ({ id })

describe('Activity permissions integration', () => {
  let permissionsService: CoursePermissionsService
  let datesService: ActivityDatesService
  let moduleRef: TestingModule

  let courseMemberService: jest.Mocked<
    Pick<CourseMemberService, 'getByUserIdAndCourseId' | 'hasWritePermission' | 'isMember'>
  >
  let courseGroupService: jest.Mocked<Pick<CourseGroupService, 'isMember'>>
  let activityMemberService: jest.Mocked<Pick<ActivityMemberService, 'isPrivateMember' | 'isMember'>>
  let activityGroupService: jest.Mocked<Pick<ActivityGroupService, 'isUserInActivityGroup' | 'numberOfGroups'>>
  let activityService: jest.Mocked<Pick<ActivityService, 'findByActivityId' | 'isHidden'>>

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)

    courseMemberService = {
      getByUserIdAndCourseId: jest.fn().mockResolvedValue(Optional.empty()),
      hasWritePermission: jest.fn().mockResolvedValue(false),
      isMember: jest.fn().mockResolvedValue(false),
    }
    courseGroupService = { isMember: jest.fn().mockResolvedValue(false) }
    activityMemberService = {
      isPrivateMember: jest.fn().mockResolvedValue(false),
      isMember: jest.fn().mockResolvedValue(true),
    }
    activityGroupService = {
      isUserInActivityGroup: jest.fn().mockResolvedValue(false),
      numberOfGroups: jest.fn().mockResolvedValue(0),
    }
    activityService = { findByActivityId: jest.fn(), isHidden: jest.fn().mockResolvedValue(false) }

    moduleRef = await Test.createTestingModule({
      providers: [
        CoursePermissionsService,
        ActivityDatesService,
        { provide: CLS_REQ, useValue: req },
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: CourseGroupService, useValue: courseGroupService },
        { provide: ActivityMemberService, useValue: activityMemberService },
        { provide: ActivityGroupService, useValue: activityGroupService },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile()

    permissionsService = moduleRef.get(CoursePermissionsService)
    datesService = moduleRef.get(ActivityDatesService)

    expect((permissionsService as any).activityDatesService).toBe(datesService)
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await moduleRef?.close()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('Restrictions Members + DateRange', () => {
    it('autorise un membre dont la période est ouverte', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(Optional.of(makeMember('member-1') as any))

      const activity = makeActivity([
        period(
          { type: 'Members', config: { members: ['member-1'] } },
          { type: 'DateRange', config: { start: START, end: END } }
        ),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).resolves.toBeUndefined()

      expect(courseMemberService.getByUserIdAndCourseId).toHaveBeenCalledWith(req.user.id, activity.courseId)
    })

    it('refuse un membre dont la période est fermée', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(Optional.of(makeMember('member-1') as any))

      const activity = makeActivity([
        period(
          { type: 'Members', config: { members: ['member-1'] } },
          {
            type: 'DateRange',
            config: {
              start: new Date('2026-03-01T00:00:00.000Z'),
              end: new Date('2026-04-01T00:00:00.000Z'),
            },
          }
        ),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).rejects.toMatchObject({
        message: 'This activity is not currently accessible',
      })
    })

    it('refuse un utilisateur qui ne figure pas dans la liste des membres autorisés', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(Optional.of(makeMember('member-99') as any))

      const activity = makeActivity([
        period(
          { type: 'Members', config: { members: ['member-1'] } },
          { type: 'DateRange', config: { start: START, end: END } }
        ),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).rejects.toMatchObject({
        message: 'This activity is not currently accessible',
      })
    })
  })

  describe('Fallback Others', () => {
    it('autorise un utilisateur qui ne correspond à aucune période spécifique', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(Optional.empty())

      const activity = makeActivity([
        period(
          { type: 'Members', config: { members: ['member-1'] } },
          { type: 'DateRange', config: { start: START, end: END } }
        ),
        period(
          { type: 'Others', config: { enabled: true } },
          { type: 'DateRange', config: { start: START, end: END } }
        ),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).resolves.toBeUndefined()
    })

    it('ne permet pas de contourner une période spécifique avec Others', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(Optional.of(makeMember('member-1') as any))

      const activity = makeActivity([
        period(
          { type: 'Members', config: { members: ['member-1'] } },
          {
            type: 'DateRange',
            config: {
              start: new Date('2026-03-01T00:00:00.000Z'),
              end: new Date('2026-04-01T00:00:00.000Z'),
            },
          }
        ),
        period(
          { type: 'Others', config: { enabled: true } },
          { type: 'DateRange', config: { start: START, end: END } }
        ),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).rejects.toMatchObject({
        message: 'This activity is not currently accessible',
      })
    })
  })

  describe('Restrictions Groups', () => {
    it('autorise un utilisateur appartenant à un groupe autorisé', async () => {
      activityGroupService.isUserInActivityGroup.mockResolvedValue(true)
      activityGroupService.numberOfGroups.mockResolvedValue(1)
      courseGroupService.isMember.mockResolvedValue(true)

      const activity = makeActivity([
        period(
          { type: 'Groups', config: { groups: ['group-1'] } },
          { type: 'DateRange', config: { start: START, end: END } }
        ),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).resolves.toBeUndefined()

      expect(courseGroupService.isMember).toHaveBeenCalledWith('group-1', req.user.id)
    })
  })

  describe('DateRange seule', () => {
    it('ne donne pas accès sans critère Members, Groups ou Correctors', async () => {
      const activity = makeActivity([
        period({
          type: 'DateRange',
          config: { start: START, end: END },
        }),
      ])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).rejects.toMatchObject({
        message: 'This activity is not currently accessible',
      })

      expect(courseMemberService.hasWritePermission).toHaveBeenCalledWith(activity.courseId, req.user)
    })
  })

  describe('Sécurité et court-circuit', () => {
    it('ne vérifie pas les dates pour un utilisateur ayant les droits d’écriture du cours', async () => {
      courseMemberService.hasWritePermission.mockResolvedValue(true)

      const activity = makeActivity([])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).resolves.toBeUndefined()

      expect(courseMemberService.getByUserIdAndCourseId).not.toHaveBeenCalled()
      expect(courseGroupService.isMember).not.toHaveBeenCalled()
    })

    it('ne donne pas accès à une activité cachée', async () => {
      activityService.isHidden.mockResolvedValue(true)

      const activity = makeActivity([])

      await expect(permissionsService.ensureActivityReadPermission(activity, req)).rejects.toBeInstanceOf(
        NotFoundResponse
      )
    })
  })
})

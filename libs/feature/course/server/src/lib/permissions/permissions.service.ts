import { Injectable } from '@nestjs/common'
import { ForbiddenResponse, NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { ActivityMemberService } from '../activity-member/activity-member.service'
import { ActivityEntity } from '../activity/activity.entity'
import { CourseMemberService } from '../course-member/course-member.service'
import { ActivityGroupService } from '../activity-group/activity-group.service'
import { ActivityService } from '../activity/activity.service'

@Injectable()
export class CoursePermissionsService {
  constructor(
    private readonly courseMemberService: CourseMemberService,
    private readonly activityMemberService: ActivityMemberService,
    private readonly activityGroupService: ActivityGroupService,
    private readonly activityService: ActivityService
  ) {}

  /** return the edition right on the course
   *
   * don't use req.user.role because the role can change for every course
   */
  async hasCourseWritePermission(courseId: string, req: IRequest): Promise<boolean> {
    if (!req.user) return false
    return this.courseMemberService.hasWritePermission(courseId, req.user)
  }

  async ensureCourseReadPermission(courseId: string, req: IRequest): Promise<void> {
    if (!req.user) {
      throw new ForbiddenResponse('Authentication required')
    }

    if (await this.courseMemberService.isMember(courseId, req.user.id)) {
      return
    }

    if (!(await this.hasCourseWritePermission(courseId, req))) {
      throw new ForbiddenResponse('You are not a member of this course')
    }
  }

  async ensureCourseWritePermission(courseId: string, req: IRequest): Promise<void> {
    if (!(await this.hasCourseWritePermission(courseId, req))) {
      throw new ForbiddenResponse('You cannot modify this course')
    }
  }

  async ensureActivityReadPermission(activity: string | ActivityEntity, req: IRequest): Promise<void> {
    if (!req.user) {
      throw new ForbiddenResponse('Authentication required')
    }

    const activityEntity =
      typeof activity === 'string'
        ? (await this.activityService.findByActivityId(activity)).orElseThrow(
            () => new NotFoundResponse(`Activity not found.`)
          )
        : activity

    const hasWriteAccess = await this.courseMemberService.hasWritePermission(activityEntity.courseId, req.user)

    if (hasWriteAccess) {
      return // teacher or admin
    }

    if (await this.activityService.isHidden(activityEntity.id)) {
      throw new NotFoundResponse(`Activity not found.`) // hidden and user is a student
    }

    const [isPrivateMember, isInGroup, isMember, numGroups] = await Promise.all([
      this.activityMemberService.isPrivateMember(activityEntity.id, req.user.id),
      this.activityGroupService.isUserInActivityGroup(activityEntity.id, req.user.id),
      this.activityMemberService.isMember(activityEntity.id, req.user.id),
      this.activityGroupService.numberOfGroups(activityEntity.id),
    ])

    if (!(isPrivateMember || isInGroup || (isMember && numGroups === 0))) {
      throw new ForbiddenResponse('You are not a member of this activity')
    }
  }

  async ensureActivityWritePermission(activity: string | ActivityEntity, req: IRequest): Promise<void> {
    if (!req.user) {
      throw new ForbiddenResponse('Authentication required')
    }

    const activityEntity =
      typeof activity === 'string'
        ? (await this.activityService.findByActivityId(activity)).orElseThrow(
            () => new NotFoundResponse(`Activity not found.`)
          )
        : activity
    if (req.user && activityEntity.creatorId === req.user.id) return
    await this.ensureCourseWritePermission(activityEntity.courseId, req)
  }
}

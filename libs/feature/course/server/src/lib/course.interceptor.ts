import { Injectable, Logger } from '@nestjs/common'
import {
  LTILaunchInterceptor,
  LTILaunchInterceptorArgs,
  RegisterLtiLaunchInterceptor,
} from '@platon/feature/lti/server'
import { CourseMemberService } from './course-member/course-member.service'
import { CourseGroupService } from './course-group/course-group.service'
import { CourseGroupMemberService } from './course-group-member/course-group-member.service'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { CourseService } from './services/course.service'
import { LmsCourseService } from './services/lms-course.service'

@Injectable()
@RegisterLtiLaunchInterceptor()
export class CourseLTIInterceptor implements LTILaunchInterceptor {
  protected readonly logger = new Logger(CourseLTIInterceptor.name)

  constructor(
    private readonly CourseService: CourseService,
    private readonly lmsCourseService: LmsCourseService,
    private readonly courseMemberService: CourseMemberService,
    private readonly courseGroupService: CourseGroupService,
    private readonly courseGroupMemberService: CourseGroupMemberService
  ) {}

  private getRoleFromPayload(payload: unknown): CourseMemberRoles {
    if (payload && typeof payload == 'object' && 'is_instructor' in payload && payload.is_instructor) {
      return CourseMemberRoles.teacher
    }
    return CourseMemberRoles.student
  }

  async intercept(args: LTILaunchInterceptorArgs): Promise<void> {
    const { payload, lms, lmsUser } = args
    const { user } = lmsUser
    const role = this.getRoleFromPayload(payload)

    const courseMatch = args.nextUrl.match(/\/courses\/(?<courseId>[^\\/]+)/)
    let courseId = courseMatch?.groups?.['courseId']

    if (!courseId) {
      const lmsCourse = await this.lmsCourseService.findLmsCourseFromLTI(payload['context_id'], lms.id)

      const lmsCoursePresent = lmsCourse.isPresent()

      if (!lmsCoursePresent && role === CourseMemberRoles.teacher) {
        const course = await this.CourseService.create({
          name: payload['context_title'],
          desc: `Cours PLaTOn rattaché à : ${payload['context_title']}`,
          ownerId: user.id,
          isTest: false,
        })

        courseId = course.id

        await this.lmsCourseService.create({
          lmsId: lms.id,
          lmsCourseId: payload['context_id'],
          courseId,
        })

        args.nextUrl = `/courses/${courseId}`
      } else if (!lmsCoursePresent && role !== CourseMemberRoles.teacher) {
        args.nextUrl = '/courses/not-found'
        return
      } else {
        courseId = lmsCourse.get().courseId
        args.nextUrl = `/courses/${courseId}`
      }
    }

    const courseMember = await this.courseMemberService.getByUserIdAndCourseId(user.id, courseId)

    courseMember.ifPresentOrElse(
      (member) => (member.role === role ? member : this.courseMemberService.updateRole(courseId, member.id, role)),
      () => {
        this.logger.log(`LTI: Adding ${user.username} to course ${courseId}`)
        return this.courseMemberService.addUser(courseId, user.id, role)
      }
    )

    const customGroups = payload['custom_groups']
    if (courseId && customGroups && customGroups.length > 0) {
      const groups = customGroups.split(',')
      for (const group of groups) {
        await this.courseGroupService.addCourseGroup(courseId, group)
        await this.courseGroupMemberService.addCourseGroupMember(group, user.id)
      }
    }
  }
}

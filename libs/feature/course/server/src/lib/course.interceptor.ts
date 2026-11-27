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

    this.logger.log(`[LTI COURSE INTERCEPTOR] Processing user: ${user.username} (ID: ${user.id})`)
    this.logger.log(`[LTI COURSE INTERCEPTOR] Resolved role: ${role}`)
    this.logger.log(`[LTI COURSE INTERCEPTOR] Current URL: ${args.nextUrl}`)

    const courseMatch = args.nextUrl.match(/\/courses\/(?<courseId>[^\\/]+)/)
    let courseId = courseMatch?.groups?.['courseId'] || payload['custom_course']

    this.logger.log(`[LTI COURSE INTERCEPTOR] CourseId extracted from URL: ${courseId || 'NOT FOUND'}`)
    this.logger.log(`[LTI COURSE INTERCEPTOR] Full payload:`, payload)

    if (!courseId) {
      const lmsCourseId = payload['id']
      if (typeof lmsCourseId !== 'string' || !lmsCourseId) {
        // Launch without a course context (the `context` claim is optional in LTI 1.3): no course to link
        this.logger.warn(`[LTI COURSE INTERCEPTOR] No LMS course id, redirecting to home`)
        args.nextUrl = '/'
        return
      }

      this.logger.log(`[LTI COURSE INTERCEPTOR] Looking up LMS course with id: ${lmsCourseId}`)
      const lmsCourse = await this.lmsCourseService.findLmsCourseFromLTI(lmsCourseId, lms.id)

      const lmsCoursePresent = lmsCourse.isPresent()
      this.logger.log(`[LTI COURSE INTERCEPTOR] LMS course found: ${lmsCoursePresent ? 'YES' : 'NO'}`)

      if (!lmsCoursePresent && role === CourseMemberRoles.teacher) {
        this.logger.log(`[LTI COURSE INTERCEPTOR] Creating a new course for the teacher`)
        this.logger.log(`[LTI COURSE INTERCEPTOR] Course title: ${payload['title']}`)

        if (!payload['title']) {
          payload['title'] = 'Cours PLaTOn'
        }

        const course = await this.CourseService.create({
          name: payload['title'] as string,
          desc: `Cours PLaTOn rattaché à : ${payload['title']}`,
          ownerId: user.id,
          isTest: false,
        })

        courseId = course.id
        this.logger.log(`[LTI COURSE INTERCEPTOR] Course created with ID: ${courseId}`)

        await this.lmsCourseService.create({
          ltiPlatformId: lms.id,
          lmsCourseId,
          courseId: courseId as string,
        })

        this.logger.log(`[LTI COURSE INTERCEPTOR] LMS-course link created`)

        args.nextUrl = `/courses/${courseId}`
        this.logger.log(`[LTI COURSE INTERCEPTOR] Updated URL: ${args.nextUrl}`)
      } else if (!lmsCoursePresent && role !== CourseMemberRoles.teacher) {
        this.logger.log(
          `[LTI COURSE INTERCEPTOR] Course not found and user is not a teacher - redirecting to not-found`
        )
        args.nextUrl = '/courses/not-found'
        return
      } else {
        courseId = lmsCourse.get().courseId
        this.logger.log(`[LTI COURSE INTERCEPTOR] Existing course found with ID: ${courseId}`)
        args.nextUrl = `/courses/${courseId}`
        this.logger.log(`[LTI COURSE INTERCEPTOR] Updated URL: ${args.nextUrl}`)
      }
    } else {
      args.nextUrl = `/courses/${courseId}`
      this.logger.log(`[LTI COURSE INTERCEPTOR] Updated URL: ${args.nextUrl}`)
    }

    this.logger.log(`[LTI COURSE INTERCEPTOR] Checking course membership for user: ${user.id}`)
    const courseMember = await this.courseMemberService.getByUserIdAndCourseId(user.id, courseId as string)

    // Enrollment must be done before returning: the client is redirected to the course right after
    if (courseMember.isPresent()) {
      const member = courseMember.get()
      this.logger.log(
        `[LTI COURSE INTERCEPTOR] Existing member found - current role: ${member.role}, LTI role: ${role}`
      )
      if (member.role !== role) {
        this.logger.log(`[LTI COURSE INTERCEPTOR] Updating role from ${member.role} to ${role}`)
        await this.courseMemberService.updateRole(courseId as string, member.id, role)
      }
    } else {
      this.logger.log(`[LTI COURSE INTERCEPTOR] Adding user ${user.username} to course ${courseId} with role ${role}`)
      await this.courseMemberService.addUser(courseId as string, user.id, role)
    }
    const customActivity = payload['custom_activity']
    if (courseId && customActivity) {
      this.logger.log(`[LTI COURSE INTERCEPTOR] Custom activity found: ${customActivity}`)
      args.nextUrl = `/player/activity/${customActivity}`
    }
    const customGroups = payload['groups'] as string
    this.logger.log(`[LTI COURSE INTERCEPTOR] Custom groups: ${customGroups || 'NONE'}`)

    if (courseId && customGroups && customGroups.length > 0) {
      const groups = customGroups.split(',')
      this.logger.log(`[LTI COURSE INTERCEPTOR] Processing ${groups.length} groups: ${groups.join(', ')}`)

      for (const group of groups) {
        this.logger.log(`[LTI COURSE INTERCEPTOR] Adding to group: ${group}`)
        await this.courseGroupService.addCourseGroup(courseId as string, group)
        await this.courseGroupMemberService.addCourseGroupMember(group, user.id)
      }

      this.logger.log(`[LTI COURSE INTERCEPTOR] All groups processed`)
    }

    this.logger.log(`[LTI COURSE INTERCEPTOR] Done processing user: ${user.username}`)
  }
}

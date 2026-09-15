import { Test } from '@nestjs/testing'
import { LmsEntity, LTILaunchInterceptorArgs } from '@platon/feature/lti/server'
import { Optional } from 'typescript-optional'
import { CourseGroupMemberService } from './course-group-member/course-group-member.service'
import { CourseGroupService } from './course-group/course-group.service'
import { CourseMemberEntity } from './course-member/course-member.entity'
import { CourseMemberService } from './course-member/course-member.service'
import { CourseEntity } from './entites/course.entity'
import { LmsCourseEntity } from './entites/lms-course.entity'
import { CourseLTIInterceptor } from './course.interceptor'
import { LmsCourseService } from './services/lms-course.service'
import { CourseService } from './services/course.service'

describe('CourseLTIInterceptor', () => {
  let interceptor: CourseLTIInterceptor
  let courseService: jest.Mocked<Pick<CourseService, 'create'>>
  let lmsCourseService: jest.Mocked<Pick<LmsCourseService, 'findLmsCourseFromLTI' | 'create'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'getByUserIdAndCourseId' | 'updateRole' | 'addUser'>>
  let courseGroupService: jest.Mocked<Pick<CourseGroupService, 'addCourseGroup'>>
  let courseGroupMemberService: jest.Mocked<Pick<CourseGroupMemberService, 'addCourseGroupMember'>>

  const lms = { id: 'lms-1' } as LmsEntity
  const user = { id: 'user-1', username: 'john' }
  const lmsUser = { id: 'lmsuser-1', user } as never

  const buildArgs = (payload: Record<string, unknown>, nextUrl = '/login'): LTILaunchInterceptorArgs =>
    ({ lms, lmsUser, payload, nextUrl } as unknown as LTILaunchInterceptorArgs)

  beforeEach(async () => {
    courseService = { create: jest.fn() }
    lmsCourseService = { findLmsCourseFromLTI: jest.fn(), create: jest.fn() }
    courseMemberService = { getByUserIdAndCourseId: jest.fn(), updateRole: jest.fn(), addUser: jest.fn() }
    courseGroupService = { addCourseGroup: jest.fn() }
    courseGroupMemberService = { addCourseGroupMember: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        CourseLTIInterceptor,
        { provide: CourseService, useValue: courseService },
        { provide: LmsCourseService, useValue: lmsCourseService },
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: CourseGroupService, useValue: courseGroupService },
        { provide: CourseGroupMemberService, useValue: courseGroupMemberService },
      ],
    }).compile()

    interceptor = module.get(CourseLTIInterceptor)
    courseMemberService.getByUserIdAndCourseId.mockResolvedValue(Optional.empty())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("devrait extraire le courseId depuis l'URL courante sans requête LMS", async () => {
    const args = buildArgs({}, '/courses/course-1/player')

    await interceptor.intercept(args)

    expect(lmsCourseService.findLmsCourseFromLTI).not.toHaveBeenCalled()
    expect(args.nextUrl).toBe('/courses/course-1')
    expect(courseMemberService.addUser).toHaveBeenCalledWith('course-1', 'user-1', 'student')
  })

  it("devrait utiliser custom_course si présent et aucun id trouvé dans l'URL", async () => {
    const args = buildArgs({ custom_course: 'course-custom' }, '/login')

    await interceptor.intercept(args)

    expect(args.nextUrl).toBe('/courses/course-custom')
  })

  it('devrait rediriger vers /courses/not-found si aucun cours LMS existant et utilisateur non enseignant', async () => {
    lmsCourseService.findLmsCourseFromLTI.mockResolvedValue(Optional.empty())
    const args = buildArgs({ context_id: 'ctx-1', is_instructor: false }, '/login')

    await interceptor.intercept(args)

    expect(args.nextUrl).toBe('/courses/not-found')
    expect(courseMemberService.addUser).not.toHaveBeenCalled()
    expect(courseMemberService.getByUserIdAndCourseId).not.toHaveBeenCalled()
  })

  it('devrait créer un nouveau cours pour un enseignant sans cours LMS existant', async () => {
    lmsCourseService.findLmsCourseFromLTI.mockResolvedValue(Optional.empty())
    courseService.create.mockResolvedValue({ id: 'new-course' } as CourseEntity)
    const args = buildArgs({ context_id: 'ctx-1', context_title: 'My Course', is_instructor: true }, '/login')

    await interceptor.intercept(args)

    expect(courseService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Course', ownerId: 'user-1', isTest: false })
    )
    expect(lmsCourseService.create).toHaveBeenCalledWith({
      lmsId: 'lms-1',
      lmsCourseId: 'ctx-1',
      courseId: 'new-course',
    })
    expect(args.nextUrl).toBe('/courses/new-course')
  })

  it('devrait réutiliser un cours LMS existant', async () => {
    lmsCourseService.findLmsCourseFromLTI.mockResolvedValue(
      Optional.of({ courseId: 'existing-course' } as LmsCourseEntity)
    )
    const args = buildArgs({ context_id: 'ctx-1' }, '/login')

    await interceptor.intercept(args)

    expect(courseService.create).not.toHaveBeenCalled()
    expect(args.nextUrl).toBe('/courses/existing-course')
  })

  describe('adhésion', () => {
    it('devrait ajouter le membre si aucune adhésion existante', async () => {
      const args = buildArgs({}, '/courses/course-1')

      await interceptor.intercept(args)

      expect(courseMemberService.addUser).toHaveBeenCalledWith('course-1', 'user-1', 'student')
      expect(courseMemberService.updateRole).not.toHaveBeenCalled()
    })

    it('devrait mettre à jour le rôle si le membre existant a un rôle différent', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(
        Optional.of({ id: 'member-1', role: 'student' } as CourseMemberEntity)
      )
      const args = buildArgs({ is_instructor: true }, '/courses/course-1')

      await interceptor.intercept(args)

      expect(courseMemberService.updateRole).toHaveBeenCalledWith('course-1', 'member-1', 'teacher')
      expect(courseMemberService.addUser).not.toHaveBeenCalled()
    })

    it('ne devrait rien faire si le membre existant a déjà le bon rôle', async () => {
      courseMemberService.getByUserIdAndCourseId.mockResolvedValue(
        Optional.of({ id: 'member-1', role: 'student' } as CourseMemberEntity)
      )
      const args = buildArgs({}, '/courses/course-1')

      await interceptor.intercept(args)

      expect(courseMemberService.updateRole).not.toHaveBeenCalled()
      expect(courseMemberService.addUser).not.toHaveBeenCalled()
    })
  })

  it('devrait rediriger vers une activité personnalisée si custom_activity est présent', async () => {
    const args = buildArgs({ custom_activity: 'activity-1' }, '/courses/course-1')

    await interceptor.intercept(args)

    expect(args.nextUrl).toBe('/player/activity/activity-1')
  })

  it('devrait ajouter le user aux groupes personnalisés', async () => {
    const args = buildArgs({ custom_groups: 'group-1,group-2' }, '/courses/course-1')

    await interceptor.intercept(args)

    expect(courseGroupService.addCourseGroup).toHaveBeenCalledWith('course-1', 'group-1')
    expect(courseGroupService.addCourseGroup).toHaveBeenCalledWith('course-1', 'group-2')
    expect(courseGroupMemberService.addCourseGroupMember).toHaveBeenCalledWith('group-1', 'user-1')
    expect(courseGroupMemberService.addCourseGroupMember).toHaveBeenCalledWith('group-2', 'user-1')
  })

  it('ne devrait pas traiter les groupes si custom_groups est absent', async () => {
    const args = buildArgs({}, '/courses/course-1')

    await interceptor.intercept(args)

    expect(courseGroupService.addCourseGroup).not.toHaveBeenCalled()
  })
})

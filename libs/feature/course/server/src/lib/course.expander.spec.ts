import { ExpandContext } from '@cisstech/nestjs-expand'
import { IRequest } from '@platon/core/server'
import { CourseMemberService } from './course-member/course-member.service'
import { CourseDTO } from './course.dto'
import { CourseExpander } from './course.expander'

describe('CourseExpander', () => {
  let expander: CourseExpander
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'hasWritePermission'>>

  beforeEach(() => {
    courseMemberService = { hasWritePermission: jest.fn() }
    expander = new CourseExpander(courseMemberService as unknown as CourseMemberService)
  })

  const buildContext = (userId: string, ownerId: string): ExpandContext<IRequest, CourseDTO> =>
    ({
      request: { user: { id: userId } } as IRequest,
      parent: { id: 'course-1', ownerId } as CourseDTO,
    } as ExpandContext<IRequest, CourseDTO>)

  it('devrait autoriser la modification pour le propriétaire du cours sans requête supplémentaire', async () => {
    const context = buildContext('owner-1', 'owner-1')

    const result = await expander.permissions(context)

    expect(result.update).toBe(true)
    expect(courseMemberService.hasWritePermission).not.toHaveBeenCalled()
  })

  it('devrait déléguer à hasWritePermission pour un non-propriétaire', async () => {
    courseMemberService.hasWritePermission.mockResolvedValue(true)
    const context = buildContext('teacher-1', 'owner-1')

    const result = await expander.permissions(context)

    expect(courseMemberService.hasWritePermission).toHaveBeenCalledWith('course-1', { id: 'teacher-1' })
    expect(result.update).toBe(true)
  })

  it('devrait refuser la modification sans permission ni propriété', async () => {
    courseMemberService.hasWritePermission.mockResolvedValue(false)
    const context = buildContext('student-1', 'owner-1')

    const result = await expander.permissions(context)

    expect(result.update).toBe(false)
  })
})

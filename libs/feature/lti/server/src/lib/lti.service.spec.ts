import { UserRoles } from '@platon/core/common'
import { IdToken, LaunchContext } from 'ltijs'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsUserService } from './lms-user.service'
import { LtiService } from './lti.service'
import { InstructorRoles, StudentRoles } from './provider/roles'

describe('LtiService', () => {
  const lmsUserService = { findOrCreate: jest.fn() as jest.MockedFunction<LmsUserService['findOrCreate']> }

  const service = new LtiService(
    {} as never,
    {} as never,
    lmsUserService as never,
    {} as never,
    {} as never,
    {} as never
  )

  const buildIdToken = (overrides: { roles?: string[]; custom?: Record<string, unknown>; nrps?: boolean } = {}) =>
    ({
      user: {
        id: '42',
        givenName: 'John',
        familyName: 'Doe',
        email: 'john@doe.fr',
        roles: overrides.roles ?? [StudentRoles.Learner],
      },
      platform: { id: 'platform-1' },
      launch: { custom: overrides.custom },
      services: { namesAndRoles: { available: overrides.nrps ?? false } },
    } as unknown as IdToken)

  /** Runs withLmsUser and returns the role and the account LmsUserService would create on a first launch. */
  const launch = async (idToken: IdToken, context?: LaunchContext) => {
    await service.withLmsUser(idToken, context)
    const [key, role, describeNewUser] = lmsUserService.findOrCreate.mock.calls[0]
    return { key, role, newUser: await describeNewUser() }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delegate to LmsUserService with the platform and the LMS id', async () => {
    const lmsUser = { id: 'lmsuser-1' } as LmsUserEntity
    lmsUserService.findOrCreate.mockResolvedValue(lmsUser)

    await expect(service.withLmsUser(buildIdToken())).resolves.toBe(lmsUser)
    expect(lmsUserService.findOrCreate).toHaveBeenCalledWith(
      { ltiPlatformId: 'platform-1', lmsUserId: '42' },
      UserRoles.student,
      expect.any(Function)
    )
  })

  it('should request the teacher role for an instructor', async () => {
    expect((await launch(buildIdToken({ roles: [InstructorRoles.Instructor] }))).role).toBe(UserRoles.teacher)
  })

  it('should use the LMS login from the custom parameter as username and keep it on the LmsUser', async () => {
    const { newUser } = await launch(buildIdToken({ custom: { username: 'jdoe' } }))

    expect(newUser).toEqual({
      lmsUsername: 'jdoe',
      baseUsername: 'jdoe',
      user: { firstName: 'John', lastName: 'Doe', email: 'john@doe.fr' },
    })
  })

  it('should fetch the LMS login through Names and Roles when the custom parameter is not substituted', async () => {
    const context = {
      namesAndRoles: {
        getMembers: jest.fn().mockResolvedValue({ members: [{ userId: '42', ext_user_username: 'jdoe' }] }),
      },
    } as unknown as LaunchContext

    const { newUser } = await launch(buildIdToken({ custom: { username: '$User.username' }, nrps: true }), context)

    expect(newUser).toEqual(expect.objectContaining({ lmsUsername: 'jdoe', baseUsername: 'jdoe' }))
  })

  it('should fall back to initial_lastname (LTI 1.1 convention) without an LMS login', async () => {
    const { newUser } = await launch(buildIdToken())

    expect(newUser).toEqual(expect.objectContaining({ lmsUsername: undefined, baseUsername: 'j_doe' }))
  })
})

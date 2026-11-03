import { UserRoles } from '@platon/core/common'
import { UserEntity } from '@platon/core/server'
import { QueryFailedError } from 'typeorm'
import { LMS_USERS_UNIQUE_INDEX, LmsUserEntity } from './entities/lms-user.entity'
import { LmsUserService, NewLmsUser } from './lms-user.service'

describe('LmsUserService', () => {
  const key = { ltiPlatformId: 'platform-1', lmsUserId: '42' }
  const newUser: NewLmsUser = { lmsUsername: 'jdoe', baseUsername: 'jdoe', user: { firstName: 'John' } }

  const transactionRepository = {
    create: jest.fn((data: Partial<LmsUserEntity>) => data),
    save: jest.fn(async (data: Partial<LmsUserEntity>) => ({ id: 'lmsuser-1', ...data })),
  }
  const transactionManager = { getRepository: jest.fn(() => transactionRepository) }
  const repository = {
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn(async (run: (manager: unknown) => unknown): Promise<unknown> => run(transactionManager)),
    },
  }
  const userService = {
    update: jest.fn(),
    createWithAvailableUsername: jest.fn(async (data: Partial<UserEntity>, username: string) => ({
      ...data,
      id: 'user-1',
      username,
    })),
  }

  const service = new LmsUserService(repository as never, userService as never)
  const describeNewUser = jest.fn(async () => newUser)

  const uniqueViolation = (constraint: string) =>
    new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505', constraint }))

  beforeEach(() => {
    jest.clearAllMocks()
    repository.findOne.mockResolvedValue(null)
  })

  describe('existing account', () => {
    it('should return it without describing a new user', async () => {
      const existing = { user: { id: 'user-1', role: UserRoles.teacher } } as LmsUserEntity
      repository.findOne.mockResolvedValue(existing)

      await expect(service.findOrCreate(key, UserRoles.student, describeNewUser)).resolves.toBe(existing)
      expect(repository.findOne).toHaveBeenCalledWith({ where: key, relations: ['user'] })
      expect(describeNewUser).not.toHaveBeenCalled()
      expect(userService.update).not.toHaveBeenCalled()
    })

    it('should promote a student to teacher', async () => {
      const existing = { user: { id: 'user-1', role: UserRoles.student } } as LmsUserEntity
      repository.findOne.mockResolvedValue(existing)

      await service.findOrCreate(key, UserRoles.teacher, describeNewUser)

      expect(userService.update).toHaveBeenCalledWith('user-1', { role: UserRoles.teacher })
      expect(existing.user.role).toBe(UserRoles.teacher)
    })
  })

  describe('first launch', () => {
    it('should create the User and the LmsUser in the same transaction', async () => {
      const lmsUser = await service.findOrCreate(key, UserRoles.student, describeNewUser)

      expect(userService.createWithAvailableUsername).toHaveBeenCalledWith(
        { firstName: 'John', role: UserRoles.student },
        'jdoe',
        transactionManager
      )
      expect(transactionManager.getRepository).toHaveBeenCalledWith(LmsUserEntity)
      expect(lmsUser).toEqual(expect.objectContaining({ ...key, username: 'jdoe', userId: 'user-1' }))
    })

    it('should reuse the account created by a simultaneous launch', async () => {
      const winner = { user: { id: 'user-2', role: UserRoles.student } } as LmsUserEntity
      repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner)
      repository.manager.transaction.mockRejectedValueOnce(uniqueViolation(LMS_USERS_UNIQUE_INDEX))

      await expect(service.findOrCreate(key, UserRoles.teacher, describeNewUser)).resolves.toBe(winner)
      expect(userService.update).toHaveBeenCalledWith('user-2', { role: UserRoles.teacher })
    })

    it('should rethrow a unique violation on another constraint', async () => {
      const error = uniqueViolation('Users_username_idx')
      repository.manager.transaction.mockRejectedValueOnce(error)

      await expect(service.findOrCreate(key, UserRoles.student, describeNewUser)).rejects.toBe(error)
      expect(repository.findOne).toHaveBeenCalledTimes(1)
    })
  })
})

import { UserRoles } from '@platon/core/common'
import type { UserEntity } from '@platon/core/server'

export const createUserEntity = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'user-test-id',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    active: true,
    role: UserRoles.teacher,
    email: 'test@example.com',
    hasPassword: false,
    lastActivity: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    hasId: jest.fn().mockReturnValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    softRemove: jest.fn().mockResolvedValue(undefined),
    recover: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as UserEntity)

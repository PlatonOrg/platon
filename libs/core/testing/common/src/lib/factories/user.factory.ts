import { User, UserRoles } from '@platon/core/common'

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-test-id',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  active: true,
  role: UserRoles.student,
  createdAt: new Date('2026-01-23T12:55:26.136Z'),
  updatedAt: new Date('2026-01-23T12:55:26.136Z'),
  ...overrides,
})

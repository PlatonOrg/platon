import { createUserEntity } from '@platon/core/testing/server'

export const createAnnouncementEntity = (overrides: Record<string, unknown> = {}) => ({
  id: 'announcement-test-id',
  title: 'Test Announcement',
  description: 'This is a test announcement.',
  active: true,
  publisher: createUserEntity(),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  displayUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  hasId: jest.fn().mockReturnValue(true),
  save: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  softRemove: jest.fn().mockResolvedValue(undefined),
  recover: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

import { UserRoles } from '@platon/core/common'

// Pas de dépendance à @platon/core/server ici (ni même en `import type`) : cette lib doit rester
// un pur leaf utilitaire de test, réutilisable par core-server lui-même sans créer de cycle.
// Le typage reste structurel : l'objet retourné reste compatible avec UserEntity partout où
// il est consommé (même mécanisme que factories/announcement.factory.ts, factories/player.factory.ts).
export const createUserEntity = (overrides: Record<string, unknown> = {}) => ({
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
})

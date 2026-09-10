import { UserRoles } from '@platon/core/common'
import { UserEntity } from '../user.entity'

// Local à core-server (et non dans @platon/core/testing/server) car cette dernière lib dépend déjà
// de core-server (via son harnais e2e : create-e2e-app.ts, test-auth.module.ts ont besoin des vraies
// entités/modules). L'y importer créerait un cycle core-server -> core-testing-server -> core-server.
// Un découplage propre nécessiterait de scinder core-testing-server en deux libs (mocks/factories
// sans dépendance vs harnais e2e qui dépend de core-server) — hors scope de ce correctif.
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

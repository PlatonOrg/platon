import { ObjectLiteral, Repository } from 'typeorm'

// Local à core-server : voir users/factories/user.factory.ts pour l'explication (core-testing-server
// dépend de core-server via son harnais e2e, donc l'inverse créerait un cycle). Ce fichier est
// identique à libs/core/testing/server/src/lib/mocks/repository.mock.ts.
export type MockRepository<T extends ObjectLiteral = ObjectLiteral> = jest.Mocked<
  Pick<
    Repository<T>,
    | 'find'
    | 'findOne'
    | 'findOneBy'
    | 'save'
    | 'create'
    | 'update'
    | 'delete'
    | 'remove'
    | 'query'
    | 'createQueryBuilder'
  >
>

export const mockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  query: jest.fn(),
  createQueryBuilder: jest.fn(),
})

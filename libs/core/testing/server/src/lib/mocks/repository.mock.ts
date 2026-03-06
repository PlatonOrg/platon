import { ObjectLiteral, Repository } from 'typeorm'

// On the one hand, we want to be able to mock the repository methods,
// but on the other hand, we don't want to mock the entire repository,
// as it would be too much work and would not be maintainable. Therefore,
// we only mock the methods that we need for our tests.
export type MockRepository<T extends ObjectLiteral = ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'find' | 'findOne' | 'findOneBy' | 'save' | 'create' | 'update' | 'delete' | 'createQueryBuilder'>
>

export const mockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
})

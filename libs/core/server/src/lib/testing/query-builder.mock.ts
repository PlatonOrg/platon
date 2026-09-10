import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'

// Local à core-server : voir users/factories/user.factory.ts pour l'explication. Identique à
// libs/core/testing/server/src/lib/mocks/query-builder.mock.ts.
export const mockSelectQueryBuilder = <T extends ObjectLiteral>() => {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0] as [T[], number]),
  }
  return qb as unknown as jest.Mocked<SelectQueryBuilder<T>>
}

import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'

export const mockSelectQueryBuilder = <T extends ObjectLiteral>() => {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
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

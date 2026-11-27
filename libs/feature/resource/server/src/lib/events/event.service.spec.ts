import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ResourceEventEntity } from './event.entity'
import { ResourceEventService } from './event.service'

describe('ResourceEventService', () => {
  let service: ResourceEventService
  let repository: MockRepository<ResourceEventEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceEventService,
        { provide: getRepositoryToken(ResourceEventEntity), useValue: mockRepository<ResourceEventEntity>() },
      ],
    }).compile()

    service = module.get(ResourceEventService)
    repository = module.get(getRepositoryToken(ResourceEventEntity))
  })

  describe('search', () => {
    it('devrait filtrer par ressource et trier par date décroissante', async () => {
      const qb = mockSelectQueryBuilder<ResourceEventEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1')

      expect(qb.where).toHaveBeenCalledWith('resource_id = :resourceId', { resourceId: 'resource-1' })
      expect(qb.orderBy).toHaveBeenCalledWith('created_at', 'DESC')
    })

    it('devrait appliquer offset et limit', async () => {
      const qb = mockSelectQueryBuilder<ResourceEventEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1', { offset: 2, limit: 8 })

      expect(qb.offset).toHaveBeenCalledWith(2)
      expect(qb.limit).toHaveBeenCalledWith(8)
    })

    it('devrait retourner le résultat de getManyAndCount', async () => {
      const qb = mockSelectQueryBuilder<ResourceEventEntity>()
      const events = [{ id: 'event-1' } as ResourceEventEntity]
      qb.getManyAndCount.mockResolvedValue([events, 1])
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.search('resource-1')

      expect(result).toEqual([events, 1])
    })
  })
})

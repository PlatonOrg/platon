import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { In } from 'typeorm'
import { ResourceViewEntity } from './view.entity'
import { ResourceViewService } from './view.service'

describe('ResourceViewService', () => {
  let service: ResourceViewService
  let repository: MockRepository<ResourceViewEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceViewService,
        { provide: getRepositoryToken(ResourceViewEntity), useValue: mockRepository<ResourceViewEntity>() },
      ],
    }).compile()

    service = module.get(ResourceViewService)
    repository = module.get(getRepositoryToken(ResourceViewEntity))
  })

  describe('findAll', () => {
    it('devrait lister les vues avec la ressource associée, triées par date décroissante', async () => {
      repository.findAndCount.mockResolvedValue([[], 0])

      await service.findAll('user-1')

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: { resource: true },
        order: { updatedAt: 'DESC' },
      })
    })
  })

  describe('create', () => {
    it("devrait rafraîchir la date de la vue existante plutôt que d'en créer une nouvelle", async () => {
      const lastView = {
        userId: 'user-1',
        resourceId: 'resource-1',
        updatedAt: new Date('2020-01-01'),
      } as ResourceViewEntity
      repository.findOne.mockResolvedValue(lastView)
      repository.save.mockResolvedValue(lastView)

      await service.create({ userId: 'user-1', resourceId: 'resource-1' })

      expect(repository.save).toHaveBeenCalledWith(lastView)
      expect(repository.find).not.toHaveBeenCalled()
    })

    it("devrait créer une nouvelle vue si aucune n'existe pour cette ressource", async () => {
      repository.findOne.mockResolvedValue(null)
      repository.find.mockResolvedValue([{ id: 'view-1' } as ResourceViewEntity])

      await service.create({ userId: 'user-1', resourceId: 'resource-1' })

      expect(repository.save).toHaveBeenCalledWith({ userId: 'user-1', resourceId: 'resource-1' })
    })

    it('devrait supprimer les vues excédentaires au-delà de 5 par utilisateur', async () => {
      repository.findOne.mockResolvedValue(null)
      const views = Array.from({ length: 7 }, (_, i) => ({ id: `view-${i}` } as ResourceViewEntity))
      repository.find.mockResolvedValue(views)

      await service.create({ userId: 'user-1', resourceId: 'resource-1' })

      expect(repository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        id: In(['view-5', 'view-6']),
      })
    })

    it('ne devrait rien supprimer si le nombre de vues ne dépasse pas la limite', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.find.mockResolvedValue([{ id: 'view-1' } as ResourceViewEntity])

      await service.create({ userId: 'user-1', resourceId: 'resource-1' })

      expect(repository.delete).not.toHaveBeenCalled()
    })
  })
})

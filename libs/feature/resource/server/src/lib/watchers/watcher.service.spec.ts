import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse, UserOrderings } from '@platon/core/common'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ResourceWatcherEntity } from './watcher.entity'
import { ResourceWatcherService } from './watcher.service'

describe('ResourceWatcherService', () => {
  let service: ResourceWatcherService
  let repository: MockRepository<ResourceWatcherEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceWatcherService,
        { provide: getRepositoryToken(ResourceWatcherEntity), useValue: mockRepository<ResourceWatcherEntity>() },
      ],
    }).compile()

    service = module.get(ResourceWatcherService)
    repository = module.get(getRepositoryToken(ResourceWatcherEntity))
  })

  describe('findByUserId', () => {
    it('devrait retourner Optional.of(watcher) avec sa relation user', async () => {
      const watcher = { resourceId: 'r1', userId: 'u1' } as ResourceWatcherEntity
      repository.findOne.mockResolvedValue(watcher)

      const result = await service.findByUserId('r1', 'u1')

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { resourceId: 'r1', userId: 'u1' },
        relations: { user: true },
      })
      expect(result.get()).toBe(watcher)
    })

    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findByUserId('r1', 'unknown')

      expect(result.isPresent()).toBe(false)
    })
  })

  describe('findAllByUserId', () => {
    it("devrait retourner tous les suivis de l'utilisateur", async () => {
      repository.find.mockResolvedValue([])

      await service.findAllByUserId('u1')

      expect(repository.find).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    })
  })

  describe('search', () => {
    it('devrait trier par nom par défaut (multi-clé)', async () => {
      const qb = mockSelectQueryBuilder<ResourceWatcherEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('r1')

      expect(qb.where).toHaveBeenCalledWith('watcher.resource_id = :resourceId', { resourceId: 'r1' })
      expect(qb.orderBy).toHaveBeenCalledWith('user.last_name', 'ASC')
      expect(qb.addOrderBy).toHaveBeenNthCalledWith(1, 'user.first_name', 'ASC')
      expect(qb.addOrderBy).toHaveBeenNthCalledWith(2, 'user.username', 'ASC')
    })

    it('devrait filtrer par texte de recherche avec f_unaccent', async () => {
      const qb = mockSelectQueryBuilder<ResourceWatcherEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('r1', { search: '  jean  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('f_unaccent'), { search: '%jean%' })
    })

    it('devrait trier sur un autre champ que NAME sans addOrderBy', async () => {
      const qb = mockSelectQueryBuilder<ResourceWatcherEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('r1', { order: UserOrderings.UPDATED_AT })

      expect(qb.orderBy).toHaveBeenCalledWith('watcher.updated_at', 'DESC')
      expect(qb.addOrderBy).not.toHaveBeenCalled()
    })

    it('devrait appliquer offset et limit', async () => {
      const qb = mockSelectQueryBuilder<ResourceWatcherEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('r1', { offset: 3, limit: 7 })

      expect(qb.offset).toHaveBeenCalledWith(3)
      expect(qb.limit).toHaveBeenCalledWith(7)
    })
  })

  describe('create', () => {
    it('devrait créer le suivi', async () => {
      const created = { resourceId: 'r1', userId: 'u1' } as ResourceWatcherEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.create({ resourceId: 'r1', userId: 'u1' })

      expect(result).toBe(created)
    })
  })

  describe('updateByUserId', () => {
    it("devrait rejeter avec NotFoundResponse si le suivi n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.updateByUserId('r1', 'u1', {})).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait fusionner les changements et sauvegarder', async () => {
      const watcher = { resourceId: 'r1', userId: 'u1' } as ResourceWatcherEntity
      repository.findOne.mockResolvedValue(watcher)
      repository.save.mockImplementation(async (w) => w as ResourceWatcherEntity)

      const result = await service.updateByUserId('r1', 'u1', { resourceId: 'r1' })

      expect(result).toBeDefined()
    })
  })

  describe('deleteByUserId', () => {
    it('devrait supprimer par resourceId et userId', async () => {
      await service.deleteByUserId('r1', 'u1')

      expect(repository.delete).toHaveBeenCalledWith({ resourceId: 'r1', userId: 'u1' })
    })
  })
})

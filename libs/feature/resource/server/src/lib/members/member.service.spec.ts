import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestResponse, NotFoundResponse, UserOrderings } from '@platon/core/common'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { EntityManager } from 'typeorm'
import { ResourceMemberEntity } from './member.entity'
import { ResourceMemberService } from './member.service'

describe('ResourceMemberService', () => {
  let service: ResourceMemberService
  let repository: MockRepository<ResourceMemberEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceMemberService,
        { provide: getRepositoryToken(ResourceMemberEntity), useValue: mockRepository<ResourceMemberEntity>() },
      ],
    }).compile()

    service = module.get(ResourceMemberService)
    repository = module.get(getRepositoryToken(ResourceMemberEntity))
  })

  describe('findByUserId', () => {
    it('devrait retourner Optional.of(member) si trouvé', async () => {
      const member = { resourceId: 'resource-1', userId: 'user-1' } as ResourceMemberEntity
      repository.findOne.mockResolvedValue(member)

      const result = await service.findByUserId('resource-1', 'user-1')

      expect(result.get()).toBe(member)
    })

    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findByUserId('resource-1', 'unknown')

      expect(result.isPresent()).toBe(false)
    })
  })

  describe('findAllByUserId', () => {
    it("devrait retourner toutes les adhésions de l'utilisateur", async () => {
      const memberships = [{ resourceId: 'resource-1' } as ResourceMemberEntity]
      repository.find.mockResolvedValue(memberships)

      const result = await service.findAllByUserId('user-1')

      expect(repository.find).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
      expect(result).toBe(memberships)
    })
  })

  describe('search', () => {
    it('devrait filtrer par ressource et trier par nom par défaut', async () => {
      const qb = mockSelectQueryBuilder<ResourceMemberEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1')

      expect(qb.where).toHaveBeenCalledWith('resource_id = :resourceId', { resourceId: 'resource-1' })
      expect(qb.orderBy).toHaveBeenCalledWith('user.last_name', 'ASC')
    })

    it('devrait filtrer par texte de recherche avec f_unaccent', async () => {
      const qb = mockSelectQueryBuilder<ResourceMemberEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1', { search: '  jean  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('f_unaccent'), { search: '%jean%' })
    })

    it('devrait filtrer par statut waiting', async () => {
      const qb = mockSelectQueryBuilder<ResourceMemberEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1', { waiting: true })

      expect(qb.andWhere).toHaveBeenCalledWith('member.waiting = :waiting', { waiting: true })
    })

    it('devrait trier sur un autre champ que NAME sans addOrderBy', async () => {
      const qb = mockSelectQueryBuilder<ResourceMemberEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1', { order: UserOrderings.CREATED_AT })

      expect(qb.orderBy).toHaveBeenCalledWith('member.created_at', 'DESC')
      expect(qb.addOrderBy).not.toHaveBeenCalled()
    })

    it('devrait appliquer offset et limit', async () => {
      const qb = mockSelectQueryBuilder<ResourceMemberEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search('resource-1', { offset: 5, limit: 10 })

      expect(qb.offset).toHaveBeenCalledWith(5)
      expect(qb.limit).toHaveBeenCalledWith(10)
    })
  })

  describe('create', () => {
    it('devrait rejeter avec BadRequestResponse si une adhésion existe déjà', async () => {
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1', userId: 'user-1' } as ResourceMemberEntity)

      await expect(service.create({ resourceId: 'resource-1', userId: 'user-1' })).rejects.toBeInstanceOf(
        BadRequestResponse
      )
    })

    it("devrait créer l'adhésion si aucune n'existe déjà", async () => {
      repository.findOne.mockResolvedValue(null)
      const created = { resourceId: 'resource-1', userId: 'user-1' } as ResourceMemberEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.create({ resourceId: 'resource-1', userId: 'user-1' })

      expect(result).toBe(created)
    })

    it("devrait utiliser l'EntityManager fourni plutôt que le repository", async () => {
      const created = { resourceId: 'resource-1', userId: 'user-1' } as ResourceMemberEntity
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(created),
        save: jest.fn().mockResolvedValue(created),
      } as unknown as EntityManager

      const result = await service.create({ resourceId: 'resource-1', userId: 'user-1' }, manager)

      expect(repository.findOne).not.toHaveBeenCalled()
      expect(result).toBe(created)
    })
  })

  describe('updateByUserId', () => {
    it("devrait rejeter avec NotFoundResponse si l'adhésion n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.updateByUserId('resource-1', 'user-1', { waiting: false })).rejects.toBeInstanceOf(
        NotFoundResponse
      )
    })

    it('devrait fusionner les changements et sauvegarder', async () => {
      const member = { resourceId: 'resource-1', userId: 'user-1', waiting: true } as ResourceMemberEntity
      repository.findOne.mockResolvedValue(member)
      repository.save.mockImplementation(async (m) => m as ResourceMemberEntity)

      const result = await service.updateByUserId('resource-1', 'user-1', { waiting: false })

      expect(result.waiting).toBe(false)
    })
  })

  describe('deleteByUserId', () => {
    it("devrait rejeter avec NotFoundResponse si l'adhésion n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.deleteByUserId('resource-1', 'user-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait supprimer l'adhésion trouvée", async () => {
      const member = { resourceId: 'resource-1', userId: 'user-1' } as ResourceMemberEntity
      repository.findOne.mockResolvedValue(member)

      await service.deleteByUserId('resource-1', 'user-1')

      expect(repository.remove).toHaveBeenCalledWith(member)
    })
  })
})

import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse, UserOrderings, UserRoles } from '@platon/core/common'
import { UserEntity } from './user.entity'
import { UserService } from './user.service'
import { createUserEntity } from './factories/user.factory'
import { MockRepository, mockRepository } from '../testing/repository.mock'
import { mockSelectQueryBuilder } from '../testing/query-builder.mock'

const UUID = '123e4567-e89b-42d3-a456-556642440001'

describe('UserService', () => {
  let service: UserService
  let repository: MockRepository<UserEntity>
  let eventEmitter: jest.Mocked<EventEmitter2>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepository<UserEntity>() },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile()

    service = module.get(UserService)
    repository = module.get(getRepositoryToken(UserEntity))
    eventEmitter = module.get(EventEmitter2)
  })

  describe('findById', () => {
    it('devrait retourner Optional.of(user) si trouvé', async () => {
      const user = createUserEntity()
      repository.findOne.mockResolvedValue(user)

      const result = await service.findById('user-1')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } })
      expect(result.get()).toBe(user)
    })

    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findById('unknown')

      expect(result.isPresent()).toBe(false)
    })
  })

  describe('findByUsername', () => {
    it('devrait chercher par username', async () => {
      const user = createUserEntity()
      repository.findOne.mockResolvedValue(user)

      const result = await service.findByUsername('testuser')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } })
      expect(result.get()).toBe(user)
    })
  })

  describe('findByIdOrName', () => {
    it('devrait chercher par id si la valeur est un UUID valide', async () => {
      repository.findOne.mockResolvedValue(createUserEntity())

      await service.findByIdOrName(UUID)

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: UUID } })
    })

    it("devrait chercher par username si la valeur n'est pas un UUID", async () => {
      repository.findOne.mockResolvedValue(createUserEntity())

      await service.findByIdOrName('testuser')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } })
    })
  })

  describe('search', () => {
    it('devrait trier par défaut sur le nom (NAME) sans filtre', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search()

      expect(qb.innerJoin).not.toHaveBeenCalled()
      expect(qb.orderBy).toHaveBeenCalledWith('user.last_name', 'ASC')
      expect(qb.addOrderBy).toHaveBeenNthCalledWith(1, 'user.first_name', 'ASC')
      expect(qb.addOrderBy).toHaveBeenNthCalledWith(2, 'user.username', 'ASC')
      expect(qb.getManyAndCount).toHaveBeenCalled()
    })

    it('devrait filtrer par groupes via un innerJoin', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ groups: ['group-1'] })

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'UserGroupsUsers',
        'group',
        'group.user_id = user.id AND group.group_id IN (:...ids)',
        { ids: ['group-1'] }
      )
    })

    it('devrait filtrer par lms via un innerJoin', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ lmses: ['lms-1'] })

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'LmsUsers',
        'lms_user',
        'lms_user.user_id = user.id AND lms_user.lms_id IN (:...ids)',
        { ids: ['lms-1'] }
      )
    })

    it('devrait filtrer par rôles', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ roles: [UserRoles.admin] })

      expect(qb.andWhere).toHaveBeenCalledWith('role IN (:...roles)', { roles: [UserRoles.admin] })
    })

    it('devrait filtrer par statut actif', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ active: false })

      expect(qb.andWhere).toHaveBeenCalledWith('active = :active', { active: false })
    })

    it('devrait filtrer par texte de recherche', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ search: '  john  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { search: '%john%' })
    })

    it('devrait trier sur un autre champ que NAME sans addOrderBy', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ order: UserOrderings.CREATED_AT })

      expect(qb.orderBy).toHaveBeenCalledWith('user.created_at', 'DESC')
      expect(qb.addOrderBy).not.toHaveBeenCalled()
    })

    it('devrait appliquer offset et limit', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ offset: 10, limit: 20 })

      expect(qb.offset).toHaveBeenCalledWith(10)
      expect(qb.limit).toHaveBeenCalledWith(20)
    })

    it('devrait retourner le résultat de getManyAndCount', async () => {
      const qb = mockSelectQueryBuilder<UserEntity>()
      const users = [createUserEntity()]
      qb.getManyAndCount.mockResolvedValue([users, 1])
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.search()

      expect(result).toEqual([users, 1])
    })
  })

  describe('create', () => {
    it("devrait sauvegarder l'utilisateur via le repository", async () => {
      const created = createUserEntity()
      repository.save.mockResolvedValue(created)

      const result = await service.create({ username: 'newuser' })

      expect(repository.save).toHaveBeenCalledWith({ username: 'newuser' })
      expect(result).toBe(created)
    })
  })

  describe('update', () => {
    it("devrait rejeter avec NotFoundResponse si l'utilisateur n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.update('unknown', { firstName: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
      expect(repository.save).not.toHaveBeenCalled()
    })

    it("devrait fusionner les changements avec l'utilisateur existant puis sauvegarder", async () => {
      const existing = createUserEntity({ firstName: 'Old', lastName: 'Name' })
      repository.findOne.mockResolvedValue(existing)
      repository.save.mockImplementation(async (u) => u as UserEntity)

      const result = await service.update('testuser', { firstName: 'New' })

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'New', lastName: 'Name' }))
      expect(result.firstName).toBe('New')
    })
  })

  describe('updateLastActivity', () => {
    it('devrait mettre à jour si la dernière activité date de plus de 5 minutes', async () => {
      const user = createUserEntity({ id: 'user-1', lastActivity: new Date(Date.now() - 10 * 60 * 1000) })

      await service.updateLastActivity(user)

      expect(repository.update).toHaveBeenCalledWith('user-1', { lastActivity: expect.any(Date) })
    })

    it('ne devrait pas mettre à jour si la dernière activité est récente', async () => {
      const user = createUserEntity({ lastActivity: new Date() })

      await service.updateLastActivity(user)

      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('touchLastLogin', () => {
    const buildQb = () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }
      return qb
    }

    it('devrait filtrer par id quand la valeur est un UUID', async () => {
      const qb = buildQb()
      repository.createQueryBuilder.mockReturnValue(qb as never)

      await service.touchLastLogin(UUID)

      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: UUID })
    })

    it("devrait filtrer par username quand la valeur n'est pas un UUID", async () => {
      const qb = buildQb()
      repository.createQueryBuilder.mockReturnValue(qb as never)

      await service.touchLastLogin('testuser')

      expect(qb.where).toHaveBeenCalledWith('username = :username', { username: 'testuser' })
    })

    it("devrait rejeter avec NotFoundResponse si aucune ligne n'est affectée", async () => {
      const qb = buildQb()
      qb.execute.mockResolvedValue({ affected: 0 })
      repository.createQueryBuilder.mockReturnValue(qb as never)

      await expect(service.touchLastLogin('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('delete', () => {
    it("devrait rejeter avec NotFoundResponse si l'utilisateur n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.delete('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it("devrait supprimer et retourner l'utilisateur trouvé", async () => {
      const user = createUserEntity()
      repository.findOne.mockResolvedValue(user)
      repository.remove.mockResolvedValue(user)

      const result = await service.delete('testuser')

      expect(repository.remove).toHaveBeenCalledWith(user)
      expect(result).toBe(user)
    })
  })

  describe('deleteInactiveUsers', () => {
    it("ne devrait rien supprimer si aucun compte demo n'est inactif", async () => {
      repository.find.mockResolvedValue([createUserEntity({ role: UserRoles.demo, lastActivity: new Date() })])

      await service.deleteInactiveUsers()

      expect(repository.remove).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
      expect(repository.query).not.toHaveBeenCalled()
    })

    it('devrait supprimer les comptes demo inactifs depuis plus de deux semaines et nettoyer les données associées', async () => {
      const oldDemo = createUserEntity({
        id: 'demo-1',
        role: UserRoles.demo,
        lastActivity: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      })
      repository.find.mockResolvedValue([oldDemo])
      repository.findOne.mockResolvedValue(oldDemo)
      repository.remove.mockResolvedValue(oldDemo)

      await service.deleteInactiveUsers()

      expect(repository.remove).toHaveBeenCalledWith(oldDemo)
      expect(eventEmitter.emit).toHaveBeenCalledWith('deleteOrphanCircles')
      expect(repository.query).toHaveBeenCalledTimes(4)
      for (const call of repository.query.mock.calls) {
        expect(call[1]).toEqual([['demo-1']])
      }
    })
  })
})

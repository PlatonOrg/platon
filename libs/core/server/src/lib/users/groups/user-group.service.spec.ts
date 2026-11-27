import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse, UserGroupOrderings } from '@platon/core/common'
import { MockRepository, mockRepository, mockSelectQueryBuilder, createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { UserService } from '../user.service'
import { UserGroupEntity } from './user-group.entity'
import { UserGroupService } from './user-group.service'

describe('UserGroupService', () => {
  let service: UserGroupService
  let repository: MockRepository<UserGroupEntity>
  let userService: jest.Mocked<UserService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
        { provide: getRepositoryToken(UserGroupEntity), useValue: mockRepository<UserGroupEntity>() },
        { provide: UserService, useValue: { findByIdOrName: jest.fn() } },
      ],
    }).compile()

    service = module.get(UserGroupService)
    repository = module.get(getRepositoryToken(UserGroupEntity))
    userService = module.get(UserService)
  })

  describe('search', () => {
    it('devrait trier par nom ASC par défaut', async () => {
      const qb = mockSelectQueryBuilder<UserGroupEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search()

      expect(qb.orderBy).toHaveBeenCalledWith('name', 'ASC')
    })

    it('devrait trier selon order/direction fournis', async () => {
      const qb = mockSelectQueryBuilder<UserGroupEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ order: UserGroupOrderings.CREATED_AT })

      expect(qb.orderBy).toHaveBeenCalledWith('created_at', 'DESC')
    })

    it('devrait filtrer par texte de recherche', async () => {
      const qb = mockSelectQueryBuilder<UserGroupEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ search: '  team  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { search: '%team%' })
    })

    it('devrait appliquer offset et limit', async () => {
      const qb = mockSelectQueryBuilder<UserGroupEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ offset: 5, limit: 15 })

      expect(qb.offset).toHaveBeenCalledWith(5)
      expect(qb.limit).toHaveBeenCalledWith(15)
    })

    it('devrait filtrer les utilisateurs invalides (sans id) de chaque groupe retourné', async () => {
      const qb = mockSelectQueryBuilder<UserGroupEntity>()
      const group = {
        id: 'group-1',
        users: [createUserEntity(), { id: undefined }],
      } as unknown as UserGroupEntity
      qb.getManyAndCount.mockResolvedValue([[group], 1])
      repository.createQueryBuilder.mockReturnValue(qb)

      const [groups] = await service.search()

      expect(groups[0].users).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('devrait créer le groupe et initialiser users à un tableau vide', async () => {
      const created = { id: 'group-1', name: 'New group' } as UserGroupEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.create({ name: 'New group' })

      expect(repository.save).toHaveBeenCalledWith(created)
      expect(result.users).toEqual([])
    })
  })

  describe('update', () => {
    it("devrait rejeter avec NotFoundResponse si le groupe n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.update('unknown', { name: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait nettoyer les utilisateurs invalides, fusionner les changements puis sauvegarder', async () => {
      const group = {
        id: 'group-1',
        name: 'Old',
        users: [createUserEntity(), { id: undefined }],
      } as unknown as UserGroupEntity
      repository.findOne.mockResolvedValue(group)
      repository.save.mockImplementation(async (g) => g as UserGroupEntity)

      const result = await service.update('group-1', { name: 'New' })

      expect(result.name).toBe('New')
      expect(result.users).toHaveLength(1)
    })
  })

  describe('delete', () => {
    it('devrait supprimer le groupe via son id', async () => {
      await service.delete('group-1')

      expect(repository.delete).toHaveBeenCalledWith('group-1')
    })
  })

  describe('fromInput', () => {
    it('ne devrait pas toucher users si non fourni', async () => {
      const result = await service.fromInput({ name: 'New group' })

      expect(result.users).toBeUndefined()
      expect(userService.findByIdOrName).not.toHaveBeenCalled()
    })

    it('devrait résoudre les utilisateurs fournis via UserService', async () => {
      const user = createUserEntity({ id: 'user-1' })
      userService.findByIdOrName.mockResolvedValue(Optional.of(user))

      const result = await service.fromInput({ name: 'New group', users: ['user-1'] })

      expect(userService.findByIdOrName).toHaveBeenCalledWith('user-1')
      expect(result.users).toEqual([user])
    })

    it("devrait rejeter avec NotFoundResponse si un utilisateur fourni n'existe pas", async () => {
      userService.findByIdOrName.mockResolvedValue(Optional.empty())

      await expect(service.fromInput({ users: ['unknown'] })).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('listMembers', () => {
    it("devrait rejeter avec NotFoundResponse si le groupe n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.listMembers('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait retourner les membres valides du groupe', async () => {
      const group = {
        id: 'group-1',
        users: [createUserEntity(), { id: undefined }],
      } as unknown as UserGroupEntity
      repository.findOne.mockResolvedValue(group)

      const members = await service.listMembers('group-1')

      expect(members).toHaveLength(1)
    })
  })
})

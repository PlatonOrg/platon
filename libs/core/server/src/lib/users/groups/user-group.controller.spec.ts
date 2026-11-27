import { Test, TestingModule } from '@nestjs/testing'
import { UserGroupController } from './user-group.controller'
import { UserGroupService } from './user-group.service'
import { UserGroupEntity } from './user-group.entity'

describe('UserGroupController', () => {
  let controller: UserGroupController
  let service: jest.Mocked<UserGroupService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserGroupController],
      providers: [
        {
          provide: UserGroupService,
          useValue: {
            search: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            fromInput: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(UserGroupController)
    service = module.get(UserGroupService)
  })

  describe('list', () => {
    it('devrait retourner les groupes mappés avec le total', async () => {
      const group = { id: 'group-1', name: 'Team', users: [] } as unknown as UserGroupEntity
      service.search.mockResolvedValue([[group], 1])

      const result = await controller.list({ search: 'team' })

      expect(service.search).toHaveBeenCalledWith({ search: 'team' })
      expect(result.total).toBe(1)
      expect(result.resources[0].name).toBe('Team')
    })
  })

  describe('create', () => {
    it('devrait construire le groupe via fromInput puis le créer', async () => {
      const fromInputResult = { name: 'New group', users: [] } as unknown as UserGroupEntity
      const created = { id: 'group-1', name: 'New group', users: [] } as unknown as UserGroupEntity
      service.fromInput.mockResolvedValue(fromInputResult)
      service.create.mockResolvedValue(created)

      const result = await controller.create({ name: 'New group' })

      expect(service.fromInput).toHaveBeenCalledWith({ name: 'New group' })
      expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New group' }))
      expect(result.resource.name).toBe('New group')
    })
  })

  describe('update', () => {
    it('devrait construire les changements via fromInput puis mettre à jour', async () => {
      const fromInputResult = { name: 'Updated' } as unknown as UserGroupEntity
      const updated = { id: 'group-1', name: 'Updated', users: [] } as unknown as UserGroupEntity
      service.fromInput.mockResolvedValue(fromInputResult)
      service.update.mockResolvedValue(updated)

      const result = await controller.update('group-1', { name: 'Updated' })

      expect(service.fromInput).toHaveBeenCalledWith({ name: 'Updated' })
      expect(service.update).toHaveBeenCalledWith('group-1', fromInputResult)
      expect(result.resource.name).toBe('Updated')
    })
  })

  describe('delete', () => {
    it('devrait déléguer la suppression au service', async () => {
      await controller.delete('group-1')

      expect(service.delete).toHaveBeenCalledWith('group-1')
    })
  })
})

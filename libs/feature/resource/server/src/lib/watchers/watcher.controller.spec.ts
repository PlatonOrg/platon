import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { ResourceWatcherController } from './watcher.controller'
import { ResourceWatcherEntity } from './watcher.entity'
import { ResourceWatcherService } from './watcher.service'

describe('ResourceWatcherController', () => {
  let controller: ResourceWatcherController
  let service: jest.Mocked<ResourceWatcherService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceWatcherController],
      providers: [
        {
          provide: ResourceWatcherService,
          useValue: { search: jest.fn(), findByUserId: jest.fn(), create: jest.fn(), deleteByUserId: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(ResourceWatcherController)
    service = module.get(ResourceWatcherService)
  })

  describe('search', () => {
    it('devrait retourner les utilisateurs qui suivent la ressource', async () => {
      const user = createUserEntity({ username: 'watcher1' })
      service.search.mockResolvedValue([[{ user } as unknown as ResourceWatcherEntity], 1])

      const result = await controller.search('r1', {})

      expect(result.total).toBe(1)
      expect(result.resources[0].username).toBe('watcher1')
    })
  })

  describe('find', () => {
    it('devrait rejeter avec NotFoundResponse si le suivi est introuvable', async () => {
      service.findByUserId.mockResolvedValue(Optional.empty())

      await expect(controller.find('r1', 'u1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait retourner l'utilisateur qui suit la ressource", async () => {
      const user = createUserEntity({ username: 'watcher1' })
      service.findByUserId.mockResolvedValue(Optional.of({ user } as unknown as ResourceWatcherEntity))

      const result = await controller.find('r1', 'u1')

      expect(result.resource.username).toBe('watcher1')
    })
  })

  describe('create', () => {
    it("devrait créer le suivi pour l'utilisateur courant", async () => {
      const req = { user: { id: 'user-1' } } as unknown as IRequest
      service.create.mockResolvedValue({ userId: 'user-1', resourceId: 'r1' } as ResourceWatcherEntity)

      await controller.create(req, 'r1')

      expect(service.create).toHaveBeenCalledWith({ userId: 'user-1', resourceId: 'r1' })
    })
  })

  describe('delete', () => {
    it("devrait rejeter si l'utilisateur tente de supprimer le suivi de quelqu'un d'autre", async () => {
      const req = { user: { id: 'user-1' } } as unknown as IRequest

      await expect(controller.delete(req, 'someone-else', 'r1')).rejects.toBeInstanceOf(UnauthorizedException)
      expect(service.deleteByUserId).not.toHaveBeenCalled()
    })

    it('devrait supprimer son propre suivi', async () => {
      const req = { user: { id: 'user-1' } } as unknown as IRequest

      await controller.delete(req, 'user-1', 'r1')

      expect(service.deleteByUserId).toHaveBeenCalledWith('r1', 'user-1')
    })
  })
})

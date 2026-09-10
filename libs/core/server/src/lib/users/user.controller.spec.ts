import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundResponse, UserRoles } from '@platon/core/common'
import { createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { UserController } from './user.controller'
import { UserService } from './user.service'

describe('UserController', () => {
  let controller: UserController
  let service: jest.Mocked<UserService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            search: jest.fn(),
            findByIdOrName: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(UserController)
    service = module.get(UserService)
  })

  describe('search', () => {
    it('devrait déléguer au service et retourner les ressources mappées avec le total', async () => {
      const users = [createUserEntity({ username: 'a' }), createUserEntity({ username: 'b' })]
      service.search.mockResolvedValue([users, 2])

      const result = await controller.search({ roles: [UserRoles.teacher] })

      expect(service.search).toHaveBeenCalledWith({ roles: [UserRoles.teacher] })
      expect(result.total).toBe(2)
      expect(result.resources).toHaveLength(2)
      expect(result.resources[0].username).toBe('a')
    })

    it('ne devrait jamais exposer le mot de passe dans les ressources retournées', async () => {
      const users = [createUserEntity({ password: 'super-secret-hash' })]
      service.search.mockResolvedValue([users, 1])

      const result = await controller.search({})

      expect(result.resources[0]).not.toHaveProperty('password')
    })
  })

  describe('find', () => {
    it("devrait retourner l'utilisateur mappé quand il existe", async () => {
      const user = createUserEntity({ username: 'testuser' })
      service.findByIdOrName.mockResolvedValue(Optional.of(user))

      const result = await controller.find('testuser')

      expect(service.findByIdOrName).toHaveBeenCalledWith('testuser')
      expect(result.resource.username).toBe('testuser')
    })

    it("devrait rejeter avec NotFoundResponse quand l'utilisateur n'existe pas", async () => {
      service.findByIdOrName.mockResolvedValue(Optional.empty())

      await expect(controller.find('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('ne devrait jamais exposer le mot de passe dans la ressource retournée', async () => {
      const user = createUserEntity({ password: 'super-secret-hash' })
      service.findByIdOrName.mockResolvedValue(Optional.of(user))

      const result = await controller.find('testuser')

      expect(result.resource).not.toHaveProperty('password')
    })
  })

  describe('update', () => {
    it('devrait déléguer au service et retourner la ressource mise à jour mappée', async () => {
      const updated = createUserEntity({ firstName: 'New' })
      service.update.mockResolvedValue(updated)

      const result = await controller.update('testuser', { firstName: 'New' })

      expect(service.update).toHaveBeenCalledWith('testuser', { firstName: 'New' })
      expect(result.resource.firstName).toBe('New')
    })
  })
})

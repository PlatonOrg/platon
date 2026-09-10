import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { Optional } from 'typescript-optional'
import { ResourceInvitationController } from './invitation.controller'
import { ResourceInvitationEntity } from './invitation.entity'
import { ResourceInvitationService } from './invitation.service'

describe('ResourceInvitationController', () => {
  let controller: ResourceInvitationController
  let service: jest.Mocked<ResourceInvitationService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceInvitationController],
      providers: [
        {
          provide: ResourceInvitationService,
          useValue: {
            findAll: jest.fn(),
            findLastOfInviteeInResource: jest.fn(),
            create: jest.fn(),
            accept: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(ResourceInvitationController)
    service = module.get(ResourceInvitationService)
  })

  describe('list', () => {
    it('devrait retourner les invitations mappées avec le total', async () => {
      service.findAll.mockResolvedValue([[{ resourceId: 'r1' } as ResourceInvitationEntity], 1])

      const result = await controller.list('r1')

      expect(service.findAll).toHaveBeenCalledWith('r1')
      expect(result.total).toBe(1)
    })
  })

  describe('find', () => {
    it("devrait rejeter avec NotFoundResponse si l'invitation est introuvable", async () => {
      service.findLastOfInviteeInResource.mockResolvedValue(Optional.empty())

      await expect(controller.find('u1', 'r1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait retourner l'invitation mappée", async () => {
      service.findLastOfInviteeInResource.mockResolvedValue(
        Optional.of({ resourceId: 'r1', inviteeId: 'u1' } as ResourceInvitationEntity)
      )

      const result = await controller.find('u1', 'r1')

      expect(result.resource).toBeDefined()
    })
  })

  describe('invite', () => {
    it("devrait créer l'invitation avec l'utilisateur courant comme invitant", async () => {
      const req = { user: { id: 'admin-1' } } as unknown as IRequest
      service.create.mockResolvedValue({ resourceId: 'r1' } as ResourceInvitationEntity)

      await controller.invite(req, 'r1', { inviteeId: 'u1' } as never)

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'r1', inviterId: 'admin-1', inviteeId: 'u1' })
      )
    })
  })

  describe('accept', () => {
    it('devrait déléguer au service et retourner le membre créé', async () => {
      service.accept.mockResolvedValue({ resourceId: 'r1', userId: 'u1' } as never)

      const result = await controller.accept('u1', 'r1')

      expect(service.accept).toHaveBeenCalledWith('r1', 'u1')
      expect(result.resource).toBeDefined()
    })
  })

  describe('decline', () => {
    it('devrait déléguer la suppression au service', async () => {
      const req = { user: { id: 'admin-1' } } as unknown as IRequest

      await controller.decline(req, 'u1', 'r1')

      expect(service.delete).toHaveBeenCalledWith('r1', 'u1')
    })
  })
})

import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { IRequest } from '@platon/core/server'
import { createUserEntity } from '@platon/core/testing/server'
import { ResourceInvitationService } from '../invitations'
import { ResourceEntity } from '../resource.entity'
import { ResourceService } from '../resource.service'
import { UserResourceController } from './user.controller'

describe('UserResourceController', () => {
  let controller: UserResourceController
  let resourceService: jest.Mocked<ResourceService>
  let invitationService: jest.Mocked<ResourceInvitationService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserResourceController],
      providers: [
        { provide: ResourceService, useValue: { getPersonal: jest.fn() } },
        { provide: ResourceInvitationService, useValue: { findAllByInviteeId: jest.fn() } },
      ],
    }).compile()

    controller = module.get(UserResourceController)
    resourceService = module.get(ResourceService)
    invitationService = module.get(ResourceInvitationService)
  })

  describe('circle', () => {
    it("devrait rejeter si le username ne correspond pas à l'utilisateur connecté", async () => {
      const req = { user: createUserEntity({ username: 'testuser' }) } as unknown as IRequest

      await expect(controller.circle(req, 'someone-else')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('devrait retourner le cercle personnel avec des permissions complètes', async () => {
      const user = createUserEntity({ username: 'testuser' })
      const req = { user } as unknown as IRequest
      resourceService.getPersonal.mockResolvedValue({ id: 'circle-1' } as ResourceEntity)

      const result = await controller.circle(req, 'testuser')

      expect(resourceService.getPersonal).toHaveBeenCalledWith(user)
      expect((result.resource as never as { permissions: { read: boolean; write: boolean } }).permissions).toEqual({
        read: true,
        write: true,
      })
    })
  })

  describe('invitations', () => {
    it("devrait retourner les invitations de l'utilisateur courant", async () => {
      const req = { user: createUserEntity({ id: 'user-1' }) } as unknown as IRequest
      invitationService.findAllByInviteeId.mockResolvedValue([[{ resourceId: 'r1' } as never], 1])

      const result = await controller.invitations(req)

      expect(invitationService.findAllByInviteeId).toHaveBeenCalledWith('user-1')
      expect(result.total).toBe(1)
    })
  })
})

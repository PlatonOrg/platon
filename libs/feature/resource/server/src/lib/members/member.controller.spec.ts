import { Test, TestingModule } from '@nestjs/testing'
import { ErrorResponse, ForbiddenResponse, UserRoles } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { ResourceMemberController } from './member.controller'
import { ResourceMemberEntity } from './member.entity'
import { ResourceMemberService } from './member.service'

describe('ResourceMemberController', () => {
  let controller: ResourceMemberController
  let service: jest.Mocked<ResourceMemberService>

  const buildReq = (overrides: Record<string, unknown> = {}): IRequest =>
    ({ user: createUserEntity({ role: UserRoles.student, ...overrides }) } as unknown as IRequest)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceMemberController],
      providers: [
        {
          provide: ResourceMemberService,
          useValue: {
            search: jest.fn(),
            findByUserId: jest.fn(),
            findAllByUserId: jest.fn(),
            create: jest.fn(),
            updateByUserId: jest.fn(),
            deleteByUserId: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(ResourceMemberController)
    service = module.get(ResourceMemberService)
  })

  describe('search', () => {
    it('devrait retourner les membres mappés avec le total', async () => {
      service.search.mockResolvedValue([[{ resourceId: 'resource-1' } as ResourceMemberEntity], 1])

      const result = await controller.search('resource-1', {})

      expect(service.search).toHaveBeenCalledWith('resource-1', {})
      expect(result.total).toBe(1)
    })
  })

  describe('find', () => {
    it('devrait rejeter si le membre est introuvable', async () => {
      service.findByUserId.mockResolvedValue(Optional.empty())

      await expect(controller.find('user-1', 'resource-1')).rejects.toBeInstanceOf(ErrorResponse)
    })

    it('devrait retourner le membre mappé', async () => {
      service.findByUserId.mockResolvedValue(
        Optional.of({ resourceId: 'resource-1', userId: 'user-1' } as ResourceMemberEntity)
      )

      const result = await controller.find('user-1', 'resource-1')

      expect(result.resource).toBeDefined()
    })
  })

  describe('post', () => {
    it("devrait créer une demande d'adhésion en attente pour l'utilisateur courant", async () => {
      const req = buildReq()
      service.create.mockResolvedValue({ resourceId: 'resource-1', userId: req.user.id } as ResourceMemberEntity)

      await controller.post(req, 'resource-1')

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'resource-1', userId: req.user.id, waiting: true })
      )
    })
  })

  describe('autoJoin', () => {
    it("devrait rejeter un enseignant qui n'est pas nouveau", async () => {
      const req = buildReq({
        role: UserRoles.teacher,
        lastLogin: new Date('2024-01-02'),
        firstLogin: new Date('2024-01-01'),
      })
      service.findAllByUserId.mockResolvedValue([])

      await expect(controller.autoJoin(req, 'resource-1')).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it("devrait rejeter un enseignant déjà membre d'une autre ressource", async () => {
      const sameDate = new Date('2024-01-01')
      const req = buildReq({ role: UserRoles.teacher, lastLogin: sameDate, firstLogin: sameDate })
      service.findAllByUserId.mockResolvedValue([{ resourceId: 'other' } as ResourceMemberEntity])

      await expect(controller.autoJoin(req, 'resource-1')).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('devrait auto-rejoindre un enseignant nouvellement créé sans adhésion existante', async () => {
      const sameDate = new Date('2024-01-01')
      const req = buildReq({ role: UserRoles.teacher, lastLogin: sameDate, firstLogin: sameDate })
      service.findAllByUserId.mockResolvedValue([])
      service.create.mockResolvedValue({ resourceId: 'resource-1', userId: req.user.id, waiting: false } as never)

      const result = await controller.autoJoin(req, 'resource-1')

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ waiting: false, permissions: { read: true, write: true } })
      )
      expect(result.resource).toBeDefined()
    })
  })

  describe('update', () => {
    it('devrait définir inviterId quand waiting passe explicitement à false', async () => {
      const req = buildReq({ id: 'admin-1' })
      service.updateByUserId.mockResolvedValue({} as ResourceMemberEntity)

      await controller.update(req, 'user-1', 'resource-1', { waiting: false })

      expect(service.updateByUserId).toHaveBeenCalledWith('resource-1', 'user-1', {
        waiting: false,
        inviterId: 'admin-1',
      })
    })

    it("ne devrait pas définir inviterId si waiting n'est pas fourni", async () => {
      const req = buildReq()
      service.updateByUserId.mockResolvedValue({} as ResourceMemberEntity)

      await controller.update(req, 'user-1', 'resource-1', { permissions: { read: true, write: false } })

      expect(service.updateByUserId).toHaveBeenCalledWith('resource-1', 'user-1', {
        permissions: { read: true, write: false },
      })
    })
  })

  describe('delete', () => {
    it("devrait rejeter si l'utilisateur n'est ni lui-même ni admin", async () => {
      const req = buildReq({ id: 'user-2', role: UserRoles.student })

      await expect(controller.delete(req, 'user-1', 'resource-1')).rejects.toBeInstanceOf(ForbiddenResponse)
      expect(service.deleteByUserId).not.toHaveBeenCalled()
    })

    it('devrait autoriser un utilisateur à se retirer lui-même', async () => {
      const req = buildReq({ id: 'user-1', role: UserRoles.student })

      await controller.delete(req, 'user-1', 'resource-1')

      expect(service.deleteByUserId).toHaveBeenCalledWith('resource-1', 'user-1')
    })

    it('devrait autoriser un admin à retirer un autre membre', async () => {
      const req = buildReq({ id: 'admin-1', role: UserRoles.admin })

      await controller.delete(req, 'user-1', 'resource-1')

      expect(service.deleteByUserId).toHaveBeenCalledWith('resource-1', 'user-1')
    })
  })
})

import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ForbiddenResponse, NotFoundResponse } from '@platon/core/common'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { DataSource, EntityManager } from 'typeorm'
import { ResourceMemberService } from '../members/member.service'
import { ResourceInvitationEntity } from './invitation.entity'
import { ResourceInvitationService } from './invitation.service'

describe('ResourceInvitationService', () => {
  let service: ResourceInvitationService
  let repository: MockRepository<ResourceInvitationEntity>
  let memberService: jest.Mocked<ResourceMemberService>
  let dataSource: { transaction: jest.Mock }

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceInvitationService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(ResourceInvitationEntity),
          useValue: mockRepository<ResourceInvitationEntity>(),
        },
        { provide: ResourceMemberService, useValue: { findByUserId: jest.fn(), create: jest.fn() } },
      ],
    }).compile()

    service = module.get(ResourceInvitationService)
    repository = module.get(getRepositoryToken(ResourceInvitationEntity))
    memberService = module.get(ResourceMemberService)
  })

  describe('findLastOfInviteeInResource', () => {
    it('devrait retourner la dernière invitation triée par date de création', async () => {
      const invitation = { resourceId: 'r1', inviteeId: 'u1' } as ResourceInvitationEntity
      repository.findOne.mockResolvedValue(invitation)

      const result = await service.findLastOfInviteeInResource('r1', 'u1')

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { resourceId: 'r1', inviteeId: 'u1' },
        order: { createdAt: 'DESC' },
      })
      expect(result.get()).toBe(invitation)
    })
  })

  describe('findAll / findAllByInviteeId', () => {
    it('devrait lister les invitations par ressource', async () => {
      repository.findAndCount.mockResolvedValue([[], 0])

      await service.findAll('r1')

      expect(repository.findAndCount).toHaveBeenCalledWith({ where: { resourceId: 'r1' } })
    })

    it('devrait lister les invitations par invité', async () => {
      repository.findAndCount.mockResolvedValue([[], 0])

      await service.findAllByInviteeId('u1')

      expect(repository.findAndCount).toHaveBeenCalledWith({ where: { inviteeId: 'u1' } })
    })
  })

  describe('create', () => {
    it("devrait rejeter si l'invité est déjà membre de la ressource", async () => {
      memberService.findByUserId.mockResolvedValue(Optional.of({ resourceId: 'r1', userId: 'u1' } as never))

      await expect(service.create({ resourceId: 'r1', inviteeId: 'u1' })).rejects.toBeInstanceOf(BadRequestException)
    })

    it("devrait créer l'invitation si l'invité n'est pas déjà membre", async () => {
      memberService.findByUserId.mockResolvedValue(Optional.empty())
      const created = { resourceId: 'r1', inviteeId: 'u1' } as ResourceInvitationEntity
      repository.save.mockResolvedValue(created)

      const result = await service.create({ resourceId: 'r1', inviteeId: 'u1' })

      expect(result).toBe(created)
    })
  })

  describe('accept', () => {
    const runTransaction = (manager: Partial<EntityManager>) =>
      dataSource.transaction.mockImplementation((fn) => fn(manager))

    it("devrait rejeter avec NotFoundResponse si l'invitation n'existe pas", async () => {
      runTransaction({ findOne: jest.fn().mockResolvedValue(null) })

      await expect(service.accept('r1', 'u1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait rejeter avec ForbiddenResponse si l'invitation ne correspond pas à l'invité", async () => {
      runTransaction({
        findOne: jest.fn().mockResolvedValue({ resourceId: 'r1', inviteeId: 'someone-else' }),
      })

      await expect(service.accept('r1', 'u1')).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it("devrait supprimer la demande et créer une adhésion à partir des infos de l'invitation", async () => {
      const invitation = {
        resourceId: 'r1',
        inviteeId: 'u1',
        inviterId: 'admin-1',
        permissions: { read: true, write: false },
      }
      const manager = { findOne: jest.fn().mockResolvedValue(invitation), remove: jest.fn() }
      runTransaction(manager)
      const createdMember = { resourceId: 'r1', userId: 'u1' } as never
      memberService.create.mockResolvedValue(createdMember)

      const result = await service.accept('r1', 'u1')

      expect(manager.remove).toHaveBeenCalledWith(invitation)
      expect(memberService.create).toHaveBeenCalledWith(
        {
          resourceId: 'r1',
          userId: 'u1',
          inviterId: 'admin-1',
          permissions: { read: true, write: false },
        },
        manager
      )
      expect(result).toBe(createdMember)
    })
  })

  describe('delete', () => {
    it("devrait rejeter avec NotFoundResponse si l'invitation n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.delete('r1', 'u1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait supprimer la dernière invitation trouvée', async () => {
      const invitation = { resourceId: 'r1', inviteeId: 'u1' } as ResourceInvitationEntity
      repository.findOne.mockResolvedValue(invitation)

      await service.delete('r1', 'u1')

      expect(repository.remove).toHaveBeenCalledWith(invitation)
    })
  })
})

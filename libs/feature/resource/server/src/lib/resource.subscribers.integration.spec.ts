/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRequest, LevelEntity, TopicEntity, UserEntity } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { ResourceEventTypes, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { DataSource, Repository } from 'typeorm'
import { ResourceEventEntity } from './events/event.entity'
import { ResourceEventSubscriber } from './events/event.subscriber'
import { ResourceInvitationEntity } from './invitations/invitation.entity'
import { ResourceInvitationSubscriber } from './invitations/invitation.subscriber'
import { ResourceMemberEntity } from './members/member.entity'
import { ResourceMemberSubscriber } from './members/member.subscriber'
import { ResourceMetaEntity } from './metadata/metadata.entity'
import { ResourceEntity } from './resource.entity'
import { ResourceService } from './resource.service'
import { ResourceSubscriber } from './resource.subscriber'
import { ResourceWatcherEntity } from './watchers/watcher.entity'

/**
 * Contrairement à resource.service.integration.spec.ts, ce fichier vérifie que les 5 subscribers
 * TypeORM se déclenchent réellement (dataSource.subscribers) sur de vrais événements insert/update/
 * remove — pas des InsertEvent/UpdateEvent fabriqués à la main comme dans les specs unitaires.
 * ResourceStatsSubscriber est volontairement exclu : il rafraîchit une vue matérialisée définie par
 * migration, absente ici (voir sa propre spec unitaire pour sa logique).
 */
describe('Resource subscribers (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let resourceRepo: Repository<ResourceEntity>
  let memberRepo: Repository<ResourceMemberEntity>
  let watcherRepo: Repository<ResourceWatcherEntity>
  let eventRepo: Repository<ResourceEventEntity>
  let request: { user: { id: string } }
  let notificationService: { sendToAllUsers: jest.Mock; sendToUser: jest.Mock; deleteWhere: jest.Mock }

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      LevelEntity,
      TopicEntity,
      ResourceEntity,
      ResourceMemberEntity,
      ResourceWatcherEntity,
      ResourceMetaEntity,
      ResourceEventEntity,
      ResourceInvitationEntity,
    ])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    resourceRepo = dataSource.getRepository(ResourceEntity)
    memberRepo = dataSource.getRepository(ResourceMemberEntity)
    watcherRepo = dataSource.getRepository(ResourceWatcherEntity)
    eventRepo = dataSource.getRepository<ResourceEventEntity>(ResourceEventEntity)

    const resourceService = new ResourceService(
      resourceRepo,
      dataSource.getRepository(ResourceMetaEntity),
      dataSource,
      { findById: jest.fn(), findAll: jest.fn() } as any,
      { findById: jest.fn(), findAll: jest.fn() } as any,
      { emit: jest.fn() } as any
    )

    request = { user: { id: '' } }
    notificationService = {
      sendToAllUsers: jest.fn().mockResolvedValue(undefined),
      sendToUser: jest.fn().mockResolvedValue(undefined),
      deleteWhere: jest.fn().mockResolvedValue(0),
    }

    // Chaque constructeur s'enregistre lui-même sur dataSource.subscribers — c'est exactement
    // ce que fait Nest au bootstrap en production, une fois par provider.
    new ResourceSubscriber(resourceService, dataSource, request as unknown as IRequest)
    new ResourceMemberSubscriber(dataSource)
    new ResourceEventSubscriber(
      dataSource,
      { search: jest.fn().mockResolvedValue([[], 0]) } as any,
      resourceService,
      notificationService as any
    )
    new ResourceInvitationSubscriber(dataSource, notificationService as any)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await dataSource.query('TRUNCATE "ResourceInvitations" CASCADE')
    await dataSource.query('TRUNCATE "ResourceEvents" CASCADE')
    await dataSource.query('TRUNCATE "ResourceMembers" CASCADE')
    await dataSource.query('TRUNCATE "ResourceWatchers" CASCADE')
    await dataSource.query('TRUNCATE "Resources" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  let userCounter = 0
  const seedUser = async (): Promise<UserEntity> => {
    userCounter++
    return userRepo.save(
      userRepo.create({
        username: `sub-integration-user-${userCounter}`,
        firstName: 'Test',
        lastName: 'User',
        email: `sub-integration-user-${userCounter}@test.local`,
        role: UserRoles.teacher,
        active: true,
        lastActivity: new Date(),
      })
    )
  }

  const seedResource = async (overrides: Partial<ResourceEntity> = {}): Promise<ResourceEntity> => {
    return resourceRepo.save(
      resourceRepo.create({
        name: 'Resource',
        type: ResourceTypes.CIRCLE,
        status: ResourceStatus.READY,
        personal: false,
        ...overrides,
      })
    )
  }

  describe('ResourceSubscriber', () => {
    it("devrait auto-créer un watcher pour le propriétaire à l'insertion d'une ressource", async () => {
      const owner = await seedUser()

      const resource = await seedResource({ ownerId: owner.id })

      const watcher = await watcherRepo.findOne({ where: { resourceId: resource.id, userId: owner.id } })
      expect(watcher).not.toBeNull()
    })

    it('devrait journaliser un événement de création sur le parent quand la ressource en a un', async () => {
      const owner = await seedUser()
      const parent = await seedResource({ ownerId: owner.id })

      const child = await seedResource({ ownerId: owner.id, parentId: parent.id } as never)

      const events = await eventRepo.find({
        where: { resourceId: parent.id, type: ResourceEventTypes.RESOURCE_CREATE },
      })
      expect(events).toHaveLength(1)
      expect(notificationService.sendToAllUsers).toHaveBeenCalled()
      void child
    })

    it('devrait journaliser un événement au changement de statut', async () => {
      const owner = await seedUser()
      request.user.id = owner.id
      const resource = await seedResource({ ownerId: owner.id, status: ResourceStatus.DRAFT })

      resource.status = ResourceStatus.READY
      await resourceRepo.save(resource)

      const events = await eventRepo.find({
        where: { resourceId: resource.id, type: ResourceEventTypes.RESOURCE_STATUS_CHANGE },
      })
      expect(events).toHaveLength(1)
    })
  })

  describe('ResourceMemberSubscriber', () => {
    it("devrait journaliser l'adhésion et créer un watcher pour un membre en attente", async () => {
      const owner = await seedUser()
      const member = await seedUser()
      const resource = await seedResource({ ownerId: owner.id })

      await memberRepo.save(
        memberRepo.create({ resourceId: resource.id, userId: member.id, inviterId: owner.id, waiting: true })
      )

      const events = await eventRepo.find({
        where: { resourceId: resource.id, type: ResourceEventTypes.MEMBER_CREATE },
      })
      expect(events).toHaveLength(1)
      const watcher = await watcherRepo.findOne({ where: { resourceId: resource.id, userId: member.id } })
      expect(watcher).not.toBeNull()
    })

    it('devrait supprimer le watcher associé et journaliser le départ à la suppression du membre', async () => {
      const owner = await seedUser()
      const member = await seedUser()
      const resource = await seedResource({ ownerId: owner.id })
      const savedMember = await memberRepo.save(
        memberRepo.create({ resourceId: resource.id, userId: member.id, inviterId: owner.id, waiting: true })
      )
      jest.clearAllMocks()

      await memberRepo.remove(savedMember)

      const watcher = await watcherRepo.findOne({ where: { resourceId: resource.id, userId: member.id } })
      expect(watcher).toBeNull()
      const events = await eventRepo.find({
        where: { resourceId: resource.id, type: ResourceEventTypes.MEMBER_REMOVE },
      })
      expect(events).toHaveLength(1)
    })
  })

  describe('ResourceEventSubscriber (notifications)', () => {
    it("devrait déclencher une notification lorsqu'un événement est journalisé", async () => {
      const owner = await seedUser()
      const member = await seedUser()
      const resource = await seedResource({ ownerId: owner.id })

      await memberRepo.save(
        memberRepo.create({ resourceId: resource.id, userId: member.id, inviterId: owner.id, waiting: false })
      )

      expect(notificationService.sendToAllUsers).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ type: 'RESOURCE-EVENT' })
      )
    })
  })

  describe('ResourceInvitationSubscriber', () => {
    it("devrait notifier l'invité à la création d'une invitation", async () => {
      const inviter = await seedUser()
      const invitee = await seedUser()
      const resource = await seedResource({ ownerId: inviter.id })

      await dataSource.getRepository(ResourceInvitationEntity).save(
        dataSource.getRepository(ResourceInvitationEntity).create({
          inviterId: inviter.id,
          inviteeId: invitee.id,
          resourceId: resource.id,
          permissions: { read: true, write: false },
        })
      )

      expect(notificationService.sendToUser).toHaveBeenCalledWith(
        invitee.id,
        expect.objectContaining({ type: 'RESOURCE-INVITATION' })
      )
    })
  })
})

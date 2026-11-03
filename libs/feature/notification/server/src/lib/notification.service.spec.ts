import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PubSubService } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { EntityManager, SelectQueryBuilder } from 'typeorm'
import { NotificationEntity } from './notification.entity'
import { NOTIFICATION_EXTRA_DATA, NotificationExtraDataProvider } from './notification.provider'
import { ON_CHANGE_NOTIFICATIONS } from './notification.pubsub'
import { NotificationService } from './notification.service'
import { HIDDEN_NOTIFICATION_TYPES } from '@platon/feature/notification/common'

describe('NotificationService', () => {
  let service: NotificationService
  let repository: MockRepository<NotificationEntity>
  let discovery: jest.Mocked<Pick<DiscoveryService, 'providersWithMetaAtKey'>>
  let pubSubService: jest.Mocked<Pick<PubSubService, 'publish'>>

  beforeEach(async () => {
    repository = mockRepository<NotificationEntity>()
    discovery = { providersWithMetaAtKey: jest.fn() }
    pubSubService = { publish: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationEntity), useValue: repository },
        { provide: DiscoveryService, useValue: discovery },
        { provide: PubSubService, useValue: pubSubService },
      ],
    }).compile()

    service = module.get(NotificationService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('init', () => {
    it('devrait enregistrer les providers de données supplémentaires découverts', async () => {
      const instance: NotificationExtraDataProvider = {
        match: jest.fn(),
        provide: jest.fn(),
      }
      discovery.providersWithMetaAtKey.mockResolvedValue([
        { discoveredClass: { name: 'MyProvider', instance } } as never,
      ])

      await service.init()

      expect(discovery.providersWithMetaAtKey).toHaveBeenCalledWith(NOTIFICATION_EXTRA_DATA)

      const notification = { data: { type: 'FOO' } } as unknown as NotificationEntity
      ;(instance.match as jest.Mock).mockReturnValue(true)
      ;(instance.provide as jest.Mock).mockResolvedValue({ extra: true })

      await expect(service.withExtraData(notification)).resolves.toEqual({ extra: true })
    })
  })

  describe('sendToUser', () => {
    it('devrait créer la notification via le repository et publier le changement', async () => {
      const data = { type: 'ACTIVITY-CLOSED', activityId: 'activity-1' }
      const dateGenerated = { groupId: 'AC_activity-1', type: 'ACTIVITY-CLOSED' }

      const notification = {
        id: '1',
        userId: 'user-1',
        data: data,
        ...dateGenerated,
      } as unknown as NotificationEntity

      repository.create.mockReturnValue(notification)
      repository.save.mockResolvedValue(notification)

      const result = await service.sendToUser('user-1', data)

      expect(repository.create).toHaveBeenCalledWith({ userId: 'user-1', data: data, ...dateGenerated })
      expect(repository.save).toHaveBeenCalledWith(notification)
      expect(result).toBe(notification)
      expect(pubSubService.publish).toHaveBeenCalledWith(ON_CHANGE_NOTIFICATIONS, {
        userId: 'user-1',
        newNotification: notification,
      })
    })

    it('devrait utiliser un EntityManager fourni au lieu du repository', async () => {
      const data = { type: 'ACTIVITY-CLOSED', activityId: 'activity-1' }
      const dateGenerated = { groupId: 'AC_activity-1', type: 'ACTIVITY-CLOSED' }

      const notification = { id: '1', userId: 'user-1', data: data, ...dateGenerated } as unknown as NotificationEntity
      const entityManager = {
        create: jest.fn().mockReturnValue(notification),
        save: jest.fn().mockResolvedValue(notification),
      } as unknown as EntityManager

      const result = await service.sendToUser('user-1', data, entityManager)

      expect(entityManager.create).toHaveBeenCalledWith(NotificationEntity, {
        userId: 'user-1',
        data: data,
        ...dateGenerated,
      })
      expect(entityManager.save).toHaveBeenCalledWith(notification)
      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(notification)
    })

    it('devrait échouer la requête si le type de notification est inconnu', async () => {
      const notification = { id: '1', userId: 'user-1', data: { type: 'FOO' } } as unknown as NotificationEntity
      const entityManager = {
        create: jest.fn().mockReturnValue(notification),
        save: jest.fn().mockResolvedValue(notification),
      } as unknown as EntityManager

      await expect(service.sendToUser('user-1', { type: 'FOO' }, entityManager)).rejects.toThrow(
        'Unknown type of notification : FOO'
      )
    })

    it('ne devrait pas faire échouer la requête si la publication pubsub échoue', async () => {
      const data = { type: 'ACTIVITY-CLOSED', activityId: 'activity-1' }
      const notification = { id: '1', userId: 'user-1', data: data } as unknown as NotificationEntity
      repository.create.mockReturnValue(notification)
      repository.save.mockResolvedValue(notification)
      pubSubService.publish.mockRejectedValue(new Error('boom'))

      await expect(service.sendToUser('user-1', data)).resolves.toBe(notification)
    })
  })

  describe('sendToAllUsers', () => {
    it('devrait envoyer une notification à chaque utilisateur', async () => {
      const data = { type: 'ACTIVITY-CLOSED', activityId: 'activity-1' }
      const dateGenerated = { groupId: 'AC_activity-1', type: 'ACTIVITY-CLOSED' }

      const notification = { id: '1', userId: '', data: data } as unknown as NotificationEntity
      repository.create.mockReturnValue(notification)
      repository.save.mockResolvedValue(notification)

      await service.sendToAllUsers(['user-1', 'user-2'], data)

      expect(repository.create).toHaveBeenCalledTimes(2)
      expect(repository.create).toHaveBeenCalledWith({ userId: 'user-1', data: data, ...dateGenerated })
      expect(repository.create).toHaveBeenCalledWith({ userId: 'user-2', data: data, ...dateGenerated })
    })
  })

  describe('notification', () => {
    const event = (subType: string, info: Record<string, unknown>) => ({
      type: 'RESOURCE-EVENT',
      eventInfo: { type: subType, ...info },
    })

    beforeEach(() => {
      // sendToUser read newNotification.data['type']for his log then send it.
      repository.create.mockImplementation((entity: any) => entity)
      repository.save.mockImplementation(async (entity: any) => entity)
    })

    // label type read from the notification | strucure expected for the group_id creation | type as define in NotificationType | group_id expected
    const cases: [label: string, data: Record<string, unknown>, type: string, groupId: string | null][] = [
      [
        'COURSE-MEMBER-CREATION',
        { type: 'COURSE-MEMBER-CREATION', courseId: 'course-1' },
        'COURSE-MEMBER-CREATION',
        'CMC_course-1_user-1',
      ],
      [
        'ACTIVITY-MEMBER-CREATION',
        { type: 'ACTIVITY-MEMBER-CREATION', activityId: 'act-1' },
        'ACTIVITY-MEMBER-CREATION',
        'AMC_act-1_user-1',
      ],
      ['CORRECTOR-CREATED', { type: 'CORRECTOR-CREATED', activityId: 'act-1' }, 'CORRECTOR-CREATED', 'CM_act-1_user-1'],
      ['CORRECTOR-REMOVED', { type: 'CORRECTOR-REMOVED', activityId: 'act-1' }, 'CORRECTOR-REMOVED', 'CM_act-1_user-1'],
      [
        'CORRECTION-PENDING',
        { type: 'CORRECTION-PENDING', activityId: 'act-1' },
        'CORRECTION-PENDING',
        'CP_act-1_user-1',
      ],
      [
        'CORRECTION-AVAILABLE',
        { type: 'CORRECTION-AVAILABLE', activityId: 'act-1' },
        'CORRECTION-AVAILABLE',
        'CA_act-1_user-1',
      ],
      ['ACTIVITY-CLOSED', { type: 'ACTIVITY-CLOSED', activityId: 'act-1' }, 'ACTIVITY-CLOSED', 'AC_act-1'],
      [
        'RESOURCE-MOVED-BY-ADMIN',
        { type: 'RESOURCE-MOVED-BY-ADMIN', resourceId: 'res-1' },
        'RESOURCE-MOVED-BY-ADMIN',
        'RMBA_res-1',
      ],
      ['EXERCISE-CHANGES', { type: 'EXERCISE-CHANGES', resourceId: 'res-1' }, 'EXERCISE-CHANGES', 'EC_res-1'],
      ['RESOURCE-INVITATION', { type: 'RESOURCE-INVITATION', resourceId: 'res-1' }, 'RESOURCE-INVITATION', 'RI_res-1'],
      [
        'MEMBER-CREATE',
        event('MEMBER_CREATE', { resourceId: 'circle-1', data: { userId: 'user-2' } }),
        'MEMBER-CREATE',
        'REMM_circle-1_user-2',
      ],
      [
        'MEMBER-REMOVE',
        event('MEMBER_REMOVE', { resourceId: 'circle-1', actorId: 'user-2' }),
        'MEMBER-REMOVE',
        'REMM_circle-1_user-2',
      ],
      [
        'RESOURCE-STATUS-CHANGE',
        event('RESOURCE_STATUS_CHANGE', { resourceId: 'res-1' }),
        'RESOURCE-STATUS-CHANGE',
        'RERSC_res-1',
      ],
      ['RESOURCE-CREATE', event('RESOURCE_CREATE', { resourceId: 'circle-1' }), 'RESOURCE-CREATE', 'RERC_circle-1'],
      // following type are utilitary and never regroup.
      ['MODERATION-ACTIVITY-CHANGES', { type: 'MODERATION-ACTIVITY-CHANGES' }, 'MODERATION-ACTIVITY-CHANGES', null],
      ['SESSION-STATE-CHANGES', { type: 'SESSION-STATE-CHANGES' }, 'SESSION-STATE-CHANGES', null],
    ]

    it.each(cases)('%s : calcule le type et le groupId', async (_label, data, type, groupId) => {
      await service.sendToUser('user-1', data)

      expect(repository.create).toHaveBeenCalledWith({ userId: 'user-1', data, type, groupId })
    })

    it('devrait regrouper CORRECTOR-CREATED et CORRECTOR-REMOVED d’une même activité', async () => {
      await service.sendToUser('user-1', { type: 'CORRECTOR-CREATED', activityId: 'act-1' })
      await service.sendToUser('user-1', { type: 'CORRECTOR-REMOVED', activityId: 'act-1' })

      const [created, removed] = repository.create.mock.calls.map((call) => (call[0] as any).groupId)
      expect(created).toBe(removed)
    })

    it('devrait regrouper MEMBER-CREATE et MEMBER-REMOVE d’un même cercle et d’un même utilisateur', async () => {
      await service.sendToUser('user-1', event('MEMBER-CREATE', { resourceId: 'circle-1', data: { userId: 'user-2' } }))
      await service.sendToUser('user-1', event('MEMBER-REMOVE', { resourceId: 'circle-1', actorId: 'user-2' }))

      const [joined, left] = repository.create.mock.calls.map((call) => (call[0] as any).groupId)
      expect(joined).toBe(left)
    })

    it('ne devrait pas regrouper (groupId null) si un identifiant manque', async () => {
      await service.sendToUser('user-1', { type: 'CORRECTION-PENDING' })

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ groupId: null }))
    })

    it('devrait rejeter un RESOURCE-EVENT sans sous-type', async () => {
      await expect(service.sendToUser('user-1', { type: 'RESOURCE-EVENT' })).rejects.toThrow(
        'Unknown type of notification : undefined'
      )
    })
  })

  describe('ofUser', () => {
    let qb: jest.Mocked<SelectQueryBuilder<NotificationEntity>>

    beforeEach(() => {
      qb = mockSelectQueryBuilder<NotificationEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)
    })

    it('devrait filtrer par utilisateur et trier par date décroissante', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0])

      await service.ofUser('user-1')

      expect(qb.where).toHaveBeenCalledWith('notification.user_id = :userId', { userId: 'user-1' })
      expect(qb.orderBy).toHaveBeenCalledWith('notification.created_at', 'DESC')
      expect(qb.andWhere).toHaveBeenCalledTimes(2) // One for time, the other for group
      expect(qb.andWhere).not.toHaveBeenCalledWith('notification.read_at IS NULL')
      expect(qb.offset).not.toHaveBeenCalled()
      expect(qb.limit).not.toHaveBeenCalled()
    })

    it('devrait filtrer les notifications non lues quand demandé', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0])

      await service.ofUser('user-1', { unread: true })

      expect(qb.andWhere).toHaveBeenCalledWith('notification.read_at IS NULL')
    })

    it('devrait appliquer offset et limit quand fournis', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0])

      await service.ofUser('user-1', { offset: 10, limit: 5 })

      expect(qb.offset).toHaveBeenCalledWith(10)
      expect(qb.limit).toHaveBeenCalledWith(5)
    })

    it('ne devrait pas exclure les types utilitaires', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0])
      await service.ofUser('user-1')
      expect(qb.andWhere).not.toHaveBeenCalledWith('notification.type NOT IN (:...hidden)', expect.anything())
    })
  })

  function mockQueryBuilder() {
    const qb: Record<string, jest.Mock> = {}
    for (const method of ['where', 'andWhere', 'orderBy', 'offset', 'limit', 'update', 'set', 'delete', 'from']) {
      qb[method] = jest.fn().mockReturnValue(qb)
    }
    qb['execute'] = jest.fn().mockResolvedValue({ affected: 0 })
    qb['getManyAndCount'] = jest.fn().mockResolvedValue([[], 0])
    qb['getCount'] = jest.fn().mockResolvedValue(0)
    return qb as any
  }

  describe('markAsRead', () => {
    it('devrait mettre à jour readAt et notifier', async () => {
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.markAsRead('user-1', ['id-1', 'id-2'])

      expect(qb['set']).toHaveBeenCalledWith({ readAt: expect.any(Date) })
      expect(qb['where']).toHaveBeenCalledWith('user_id = :userId', { userId: 'user-1' })
      expect(qb['andWhere']).toHaveBeenCalledWith(expect.stringContaining('IN (:...ids)'), { ids: ['id-1', 'id-2'] })
      expect(qb['andWhere']).toHaveBeenCalledWith('read_at IS NULL')
      expect(pubSubService.publish).toHaveBeenCalledWith(ON_CHANGE_NOTIFICATIONS, { userId: 'user-1' })
    })
  })

  describe('markAsUnread', () => {
    it('devrait remettre readAt à null et notifier', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as never)

      await service.markAsUnread('user-1', ['id-1'])

      expect(repository.update).toHaveBeenCalledWith({ userId: 'user-1', id: expect.anything() }, { readAt: null })
      expect(pubSubService.publish).toHaveBeenCalled()
    })
  })

  describe('markAllAsRead', () => {
    it("devrait marquer toutes les notifications non lues de l'utilisateur comme lues", async () => {
      repository.update.mockResolvedValue({ affected: 3 } as never)

      await service.markAllAsRead('user-1')

      expect(repository.update).toHaveBeenCalledWith(
        { userId: 'user-1', readAt: expect.anything() },
        { readAt: expect.any(Date) }
      )
      expect(pubSubService.publish).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('devrait supprimer les notifications et notifier si des lignes ont été affectées', async () => {
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)
      qb['execute'].mockResolvedValue({ affected: 2 })

      await expect(service.delete('user-1', ['n1'])).resolves.toBe(2)
      expect(qb['from']).toHaveBeenCalledWith(NotificationEntity)
      expect(qb['where']).toHaveBeenCalledWith('user_id = :userId', { userId: 'user-1' })
      expect(pubSubService.publish).toHaveBeenCalled()
    })

    it('ne devrait pas notifier si aucune ligne affectée', async () => {
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)
      qb['execute'].mockResolvedValue({ affected: 0 })
      const result = await service.delete('user-1', ['id-1'])

      expect(result).toBe(0)
      expect(pubSubService.publish).not.toHaveBeenCalled()
    })
  })

  describe('deleteAll', () => {
    it("devrait supprimer toutes les notifications de l'utilisateur et notifier", async () => {
      repository.delete.mockResolvedValue({ affected: 5 } as never)

      const result = await service.deleteAll('user-1')

      expect(repository.delete).toHaveBeenCalledWith({ userId: 'user-1' })
      expect(result).toBe(5)
      expect(pubSubService.publish).toHaveBeenCalled()
    })

    it('ne devrait pas notifier si aucune ligne affectée', async () => {
      repository.delete.mockResolvedValue({ affected: 0 } as never)

      const result = await service.deleteAll('user-1')

      expect(result).toBe(0)
      expect(pubSubService.publish).not.toHaveBeenCalled()
    })
  })

  describe('deleteWhere', () => {
    it('devrait construire une requête de suppression filtrée par utilisateur et appliquer les expressions', async () => {
      const execute = jest.fn().mockResolvedValue({ affected: 1 })
      const deleteQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute,
      }
      const fromQb = { from: jest.fn().mockReturnValue(deleteQb) }
      const qb = {
        delete: jest.fn().mockReturnValue(fromQb),
      }
      repository.createQueryBuilder.mockReturnValue(qb as never)

      const extraExpression = jest.fn((builder) => builder.andWhere('type = :type', { type: 'FOO' }))

      const result = await service.deleteWhere('user-1', extraExpression as never)

      expect(qb.delete).toHaveBeenCalled()
      expect(fromQb.from).toHaveBeenCalledWith(NotificationEntity)
      expect(deleteQb.where).toHaveBeenCalledWith('user_id = :userId', { userId: 'user-1' })
      expect(extraExpression).toHaveBeenCalledWith(deleteQb)
      expect(result).toBe(1)
      expect(pubSubService.publish).toHaveBeenCalled()
    })

    it('ne devrait pas notifier si aucune ligne affectée', async () => {
      const execute = jest.fn().mockResolvedValue({ affected: 0 })
      const deleteQb = { where: jest.fn().mockReturnThis(), execute }
      const fromQb = { from: jest.fn().mockReturnValue(deleteQb) }
      const qb = { delete: jest.fn().mockReturnValue(fromQb) }
      repository.createQueryBuilder.mockReturnValue(qb as never)

      const result = await service.deleteWhere('user-1')

      expect(result).toBe(0)
      expect(pubSubService.publish).not.toHaveBeenCalled()
    })
  })

  describe('unreadCount', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-21T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("devrait compter les notifications non lues de l'utilisateur", async () => {
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)
      qb['getCount'].mockResolvedValue(4)

      await expect(service.unreadCount('user-1')).resolves.toBe(4)
      expect(qb['andWhere']).toHaveBeenCalledWith('notification.read_at IS NULL')
      expect(qb['andWhere']).toHaveBeenCalledWith('notification.created_at > :maxAge', {
        maxAge: new Date('2025-10-21T12:00:00Z'),
      })
    })
    it('devrait exclure les types utilitaires', async () => {
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)
      await service.unreadCount('user-1')
      expect(qb['andWhere']).toHaveBeenCalledWith('notification.type NOT IN (:...hidden)', {
        hidden: Object.values(HIDDEN_NOTIFICATION_TYPES),
      })
    })
  })

  describe('withExtraData', () => {
    it('devrait retourner undefined si aucun provider ne correspond', async () => {
      const notification = { data: { type: 'FOO' } } as unknown as NotificationEntity

      await expect(service.withExtraData(notification)).resolves.toBeUndefined()
    })
  })

  describe('deleteOldNotifications', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-21T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("devrait supprimer les notifications de plus d'un an", async () => {
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.deleteOldNotifications()

      expect(qb['from']).toHaveBeenCalledWith(NotificationEntity)
      expect(qb['where']).toHaveBeenCalledWith('created_at < :maxAge', {
        maxAge: new Date('2025-10-21T12:00:00Z'),
      })
      expect(qb['execute']).toHaveBeenCalledTimes(1)
    })

    it('devrait journaliser le nombre de notifications supprimées', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation()
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)
      qb['execute'].mockResolvedValue({ affected: 7 })

      await service.deleteOldNotifications()

      expect(logSpy).toHaveBeenCalledWith('Done deleting 7 notifications that were created at least 12 months ago')
    })

    it("devrait journaliser 0 si rien n'est supprimé", async () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation()
      const qb = mockQueryBuilder()
      repository.createQueryBuilder.mockReturnValue(qb)
      qb['execute'].mockResolvedValue({ affected: undefined })

      await service.deleteOldNotifications()

      expect(logSpy).toHaveBeenCalledWith('Done deleting 0 notifications that were created at least 12 months ago')
    })
  })
})

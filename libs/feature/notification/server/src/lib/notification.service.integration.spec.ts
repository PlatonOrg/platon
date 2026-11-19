import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { UserRoles } from '@platon/core/common'
import { PubSubService, UserEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { DataSource, Repository } from 'typeorm'
import { NotificationEntity } from './notification.entity'
import { NotificationService } from './notification.service'

/**
 * Contrairement à notification.service.spec.ts (repository/query builder mockés), ce fichier fait
 * tourner NotificationService contre un vrai Postgres (Testcontainers) pour exercer :
 * - la cascade DB réelle (onDelete: 'CASCADE' sur NotificationEntity.user), invisible à un mock
 *   de repository qui ne supprime jamais réellement de lignes liées ;
 * - deleteWhere() avec une vraie expression de query builder chaînée (buildDeleteQuery), plutôt
 *   qu'un mock de delete()/from()/where() qui ne vérifie jamais que le SQL généré est valide ;
 * - ofUser() avec un vrai tri/pagination/filtre sur une vraie table.
 */
describe('NotificationService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let notificationRepo: Repository<NotificationEntity>
  let service: NotificationService

  const discovery = { providersWithMetaAtKey: jest.fn().mockResolvedValue([]) } as unknown as DiscoveryService

  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)
  const monthsAgo = (m: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() - m)
    return d
  }

  const send = async (userId: string, data: object, createdAt = new Date()) => {
    const n = await service.sendToUser(userId, data)
    await dataSource.query(`UPDATE "Notifications" SET "created_at" = $1 WHERE "id" = $2`, [createdAt, n.id])
    return n
  }

  const pending = (activityId: string) => ({ type: 'CORRECTION-PENDING', courseId: 'course-1', activityId })
  const closed = (activityId: string) => ({ type: 'ACTIVITY-CLOSED', courseId: 'course-1', activityId })
  const exerciseChanges = (activityId: string) => ({
    type: 'EXERCISE-CHANGES',
    userId: 'student-1',
    activityId,
    changes: {},
  })

  beforeAll(async () => {
    testDb = await createTestDatabase([UserEntity, NotificationEntity])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    notificationRepo = dataSource.getRepository(NotificationEntity)

    // Le pubsub ne fait pas partie de ce qu'on veut valider ici (DB réelle) ; PubSub réel exige
    // Redis, donc on garde un simple stub côté publish comme dans les specs unitaires.
    const pubSubService = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as PubSubService
    service = new NotificationService(notificationRepo, discovery, pubSubService)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "Notifications" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  let userCounter = 0
  const seedUser = async (): Promise<UserEntity> => {
    userCounter++
    return userRepo.save(
      userRepo.create({
        username: `notif-integration-user-${userCounter}`,
        firstName: 'Test',
        lastName: 'User',
        email: `notif-integration-user-${userCounter}@test.local`,
        role: UserRoles.student,
        active: true,
        lastActivity: new Date(),
      })
    )
  }

  describe('cascade DB', () => {
    it("devrait supprimer automatiquement les notifications d'un utilisateur supprimé", async () => {
      const user = await seedUser()
      await send(user.id, closed('act-1'))

      await userRepo.delete(user.id)

      const remaining = await notificationRepo.find({ where: { userId: user.id } })
      expect(remaining).toHaveLength(0)
    })
  })

  describe('deleteWhere', () => {
    it('devrait supprimer uniquement les notifications correspondant à une expression additionnelle réelle', async () => {
      const user = await seedUser()
      await send(user.id, closed('act-1'))
      await send(user.id, pending('act-1'))

      const affected = await service.deleteWhere(user.id, (qb) =>
        qb.andWhere(`data->>'type' = :notifType`, { notifType: 'ACTIVITY-CLOSED' })
      )

      expect(affected).toBe(1)
      const remaining = await notificationRepo.find({ where: { userId: user.id } })
      expect(remaining).toHaveLength(1)
      expect(remaining[0].data['type']).toBe('CORRECTION-PENDING')
    })

    it("ne devrait pas supprimer les notifications d'un autre utilisateur", async () => {
      const user1 = await seedUser()
      const user2 = await seedUser()
      await send(user1.id, closed('act-1'))
      await send(user2.id, closed('act-1'))

      await service.deleteWhere(user1.id)

      expect(await notificationRepo.find({ where: { userId: user1.id } })).toHaveLength(0)
      expect(await notificationRepo.find({ where: { userId: user2.id } })).toHaveLength(1)
    })
  })

  describe('ofUser', () => {
    it('devrait trier par date décroissante, filtrer les non lues et paginer', async () => {
      const user = await seedUser()
      const n1 = await send(user.id, closed('act-1'), minutesAgo(10))
      const n2 = await send(user.id, closed('act-2'), minutesAgo(5))
      await notificationRepo.update(n1.id, { readAt: new Date() })

      const [unread] = await service.ofUser(user.id, { unread: true })
      expect(unread.map((n) => n.id)).toEqual([n2.id])

      const [all] = await service.ofUser(user.id)
      expect(all.map((n) => n.id)).toEqual([n2.id, n1.id])

      const [paged] = await service.ofUser(user.id, { offset: 1, limit: 1 })
      expect(paged.map((n) => n.id)).toEqual([n1.id])
    })
  })

  describe('markAsRead / markAllAsRead / unreadCount', () => {
    it('devrait marquer une notification comme lue puis refléter le compteur', async () => {
      const user = await seedUser()
      const n1 = await send(user.id, closed('act-1'))
      await send(user.id, closed('act-2'))

      expect(await service.unreadCount(user.id)).toBe(2)

      await service.markAsRead(user.id, [n1.id])
      expect(await service.unreadCount(user.id)).toBe(1)

      await service.markAllAsRead(user.id)
      expect(await service.unreadCount(user.id)).toBe(0)
    })
  })

  describe('regroupement', () => {
    it('ofUser ne renvoie que la plus récente de chaque groupe', async () => {
      const user = await seedUser()
      await send(user.id, pending('act-1'), minutesAgo(30))
      const latest = await send(user.id, pending('act-1'), minutesAgo(10))
      const other = await send(user.id, pending('act-2'), minutesAgo(20))

      const [items, count] = await service.ofUser(user.id)

      expect(items.map((n) => n.id)).toEqual([latest.id, other.id])
      expect(count).toBe(2)
    })

    it('ne mélange pas les groupes de deux utilisateurs (AC_<activité> sans userId)', async () => {
      const user1 = await seedUser()
      const user2 = await seedUser()
      await send(user1.id, closed('act-1'), minutesAgo(10))
      const older = await send(user2.id, closed('act-1'), minutesAgo(20))

      const [items] = await service.ofUser(user2.id)

      expect(items.map((n) => n.id)).toEqual([older.id])
    })

    it('unreadCount compte un élément par groupe et ignore les types techniques', async () => {
      const user = await seedUser()
      await send(user.id, pending('act-1'), minutesAgo(30))
      await send(user.id, pending('act-1'), minutesAgo(10))
      await send(user.id, pending('act-2'))
      await send(user.id, exerciseChanges('act-1'))

      expect(await service.unreadCount(user.id)).toBe(2)
    })

    it('markAsRead marque les plus anciennes du groupe mais pas une plus récente', async () => {
      const user = await seedUser()
      const oldest = await send(user.id, pending('act-1'), minutesAgo(30))
      const middle = await send(user.id, pending('act-1'), minutesAgo(20))
      const newest = await send(user.id, pending('act-1'), minutesAgo(10))

      await service.markAsRead(user.id, [middle.id])

      const rows = await notificationRepo.find({ where: { userId: user.id } })
      const readAt = Object.fromEntries(rows.map((r) => [r.id, r.readAt]))
      expect(readAt[oldest.id]).not.toBeNull()
      expect(readAt[middle.id]).not.toBeNull()
      expect(readAt[newest.id]).toBeNull()
    })

    it('delete supprime aussi les plus anciennes du groupe, sans toucher aux autres groupes', async () => {
      const user = await seedUser()
      await send(user.id, pending('act-1'), minutesAgo(30))
      const newest = await send(user.id, pending('act-1'), minutesAgo(10))
      const other = await send(user.id, pending('act-2'), minutesAgo(20))

      await expect(service.delete(user.id, [newest.id])).resolves.toBe(2)

      const remaining = await notificationRepo.find({ where: { userId: user.id } })
      expect(remaining.map((n) => n.id)).toEqual([other.id])
    })

    it("delete ne supprime pas les notifications d'un autre utilisateur", async () => {
      const user1 = await seedUser()
      const user2 = await seedUser()
      const n = await send(user2.id, pending('act-1'))

      await expect(service.delete(user1.id, [n.id])).resolves.toBe(0)

      expect(await notificationRepo.find({ where: { userId: user2.id } })).toHaveLength(1)
    })

    it('ne regroupe pas EXERCISE-CHANGES : en supprimer une ne supprime pas les autres', async () => {
      const user = await seedUser()
      const first = await send(user.id, exerciseChanges('act-1'), minutesAgo(20))
      const second = await send(user.id, exerciseChanges('act-1'), minutesAgo(10))

      await expect(service.delete(user.id, [second.id])).resolves.toBe(1)

      const remaining = await notificationRepo.find({ where: { userId: user.id } })
      expect(remaining.map((n) => n.id)).toEqual([first.id])
    })
  })

  describe('purgeExpired', () => {
    it("supprime les notifications de plus d'un an, lues ou non, et garde les autres", async () => {
      const user = await seedUser()
      await send(user.id, pending('act-1'), monthsAgo(13))
      const oldRead = await send(user.id, closed('act-2'), monthsAgo(13))
      await notificationRepo.update(oldRead.id, { readAt: new Date() })
      const recentRead = await send(user.id, closed('act-3'), monthsAgo(8))
      await notificationRepo.update(recentRead.id, { readAt: monthsAgo(7) })
      const recentUnread = await send(user.id, pending('act-4'))

      await service.deleteOldNotifications()

      const remaining = await notificationRepo.find({ where: { userId: user.id } })
      expect(remaining.map((n) => n.id).sort()).toEqual([recentRead.id, recentUnread.id].sort())
    })
  })
})

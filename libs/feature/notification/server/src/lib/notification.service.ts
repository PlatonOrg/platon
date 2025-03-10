import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DeleteWhereExpression, PubSubService, buildDeleteQuery } from '@platon/core/server'
import { NotificationFilters } from '@platon/feature/notification/common'
import { EntityManager, In, IsNull, Repository } from 'typeorm'
import { NotificationEntity } from './notification.entity'
import { NOTIFICATION_EXTRA_DATA, NotificationExtraDataProvider } from './notification.provider'
import { ON_CHANGE_NOTIFICATIONS, OnChangeNotificationsPayload } from './notification.pubsub'

@Injectable()
export class NotificationService {
  protected readonly logger = new Logger(NotificationService.name)
  private readonly extraDataProviders: NotificationExtraDataProvider[] = []

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repository: Repository<NotificationEntity>,
    private readonly discovery: DiscoveryService,
    private readonly pubSubService: PubSubService
  ) {}

  async init(): Promise<void> {
    const providers = await this.discovery.providersWithMetaAtKey(NOTIFICATION_EXTRA_DATA)
    for (const provider of providers) {
      this.logger.log(`Registering notification extra data provider ${provider.discoveredClass.name}`)
      this.extraDataProviders.push(provider.discoveredClass.instance as NotificationExtraDataProvider)
    }
  }

  async sendToUser<T extends object>(
    userId: string,
    data: T,
    entityManager?: EntityManager
  ): Promise<NotificationEntity> {
    const newNotification = entityManager
      ? await entityManager.save(entityManager.create(NotificationEntity, { userId, data }))
      : await this.repository.save(this.repository.create({ userId, data }))

    this.logger.log(`Sending notification to user ${userId}: ${newNotification.data['type']}`)

    this.notifyUserAboutChanges(userId, { newNotification })

    return newNotification
  }

  async sendToAllUsers<T extends object>(users: string[], data: T, entityManager?: EntityManager): Promise<void> {
    await Promise.all(
      users.map((userId) => {
        return this.sendToUser(userId, data, entityManager)
      })
    )
  }

  async ofUser(userId: string, filters: NotificationFilters = {}): Promise<[NotificationEntity[], number]> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('user_id = :userId', { userId })
      .orderBy('created_at', 'DESC')

    if (filters.unread) {
      query.andWhere('read_at IS NULL')
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    if (filters.limit) {
      query.limit(filters.limit)
    }

    return query.getManyAndCount()
  }

  async markAsRead(userId: string, ids: string[]): Promise<void> {
    await this.repository.update(
      {
        userId,
        id: In(ids),
      },
      { readAt: new Date() }
    )

    this.notifyUserAboutChanges(userId)
  }

  async markAsUnread(userId: string, ids: string[]): Promise<void> {
    await this.repository.update(
      {
        userId,
        id: In(ids),
      },
      { readAt: null }
    )
    this.notifyUserAboutChanges(userId)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.update(
      {
        userId,
        readAt: IsNull(),
      },
      { readAt: new Date() }
    )
    this.notifyUserAboutChanges(userId)
  }

  async delete(userId: string, ids: string[]): Promise<number> {
    const result = await this.repository.delete(ids)

    const affected = result.affected || 0
    if (affected) {
      this.notifyUserAboutChanges(userId)
    }

    return affected
  }

  async deleteAll(userId: string): Promise<number> {
    const result = await this.repository.delete({ userId })

    const affected = result.affected || 0
    if (affected) {
      this.notifyUserAboutChanges(userId)
    }

    return affected
  }

  async deleteWhere(userId: string, ...expressions: DeleteWhereExpression<NotificationEntity>[]): Promise<number> {
    const query = buildDeleteQuery(
      this.repository.createQueryBuilder().delete().from(NotificationEntity),

      (qb) => qb.where('user_id = :userId', { userId }),
      ...expressions
    )

    const result = await query.execute()
    const affected = result.affected || 0
    if (affected) {
      this.notifyUserAboutChanges(userId)
    }

    return affected
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        readAt: IsNull(),
      },
    })
  }

  async withExtraData(notification: NotificationEntity): Promise<Record<string, unknown> | undefined> {
    for (const provider of this.extraDataProviders) {
      if (provider.match(notification.data)) {
        return provider.provide(notification.data)
      }
    }
    return undefined
  }

  private notifyUserAboutChanges(userId: string, changes?: Partial<OnChangeNotificationsPayload>): void {
    this.pubSubService
      .publish<OnChangeNotificationsPayload>(ON_CHANGE_NOTIFICATIONS, {
        userId,
        ...changes,
      })
      .catch(this.logger.error.bind(this.logger))
  }
}

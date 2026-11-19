import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DeleteWhereExpression, PubSubService, buildDeleteQuery } from '@platon/core/server'
import {
  HIDDEN_NOTIFICATION_TYPES,
  MAX_AGE_MONTHS,
  NotificationFilters,
  NotificationType,
} from '@platon/feature/notification/common'
import { EntityManager, In, IsNull, Repository } from 'typeorm'
import { NotificationEntity } from './notification.entity'
import { NOTIFICATION_EXTRA_DATA, NotificationExtraDataProvider } from './notification.provider'
import { ON_CHANGE_NOTIFICATIONS, OnChangeNotificationsPayload } from './notification.pubsub'
import {
  ActivityClosedNotification,
  ActivityMemberCreationNotification,
  CorrectionAvailableNotification,
  CorrectionPendingNotification,
  CorrectorCreatedNotification,
  CourseMemberCreationNotification,
  ResourceMovedByAdminNotification,
} from '@platon/feature/course/common'

import {
  ResourceEventNotification,
  ResourceMemberRemoveEvent,
  ResourceMemberCreateEvent,
  ResourceStatusChangeEvent,
  ResourceCreateEvent,
  ResourceInvitationNotification,
} from '@platon/feature/resource/common'

type Data = Record<string, any>

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

  /** transforme the given information into a string with every element separeted by '_'
   *
   * @param prefix the regroup prefix that identifie the notification type
   * @param parts all other information needed (course_id, user_id, resource_id, ... ) to join
   * @returns the group id or null if something is missing
   */
  private groupIdToString(prefix: string, ...parts: unknown[]): string | null {
    for (const element of parts) {
      if (element === undefined || element === null || element === '') {
        this.logger.error(
          `Failed to generate group_id: Missing required element in parts: ${JSON.stringify(
            parts
          )} for prefix : ${prefix}`
        )
        return null
      }
    }
    return [prefix, ...parts].join('_')
  }

  /** give the group_id corresponding to the notification.
   *
   * @param type the notification type
   * @param userId the user_id destination
   * @param date the notification data
   * @return the group_id or null if not necessery or somethings is missing
   */
  private resolveGroupId(type: NotificationType, userId: string, data: object): string | null {
    switch (type) {
      case NotificationType.COURSE_MEMBER_CREATION: {
        const typedData = data as CourseMemberCreationNotification
        return this.groupIdToString('CMC', typedData.courseId, userId)
      }

      case NotificationType.ACTIVITY_MEMBER_CREATION: {
        const typedData = data as ActivityMemberCreationNotification
        return this.groupIdToString('AMC', typedData.activityId, userId)
      }

      case NotificationType.CORRECTOR_CREATED:
      case NotificationType.CORRECTOR_REMOVED: {
        const typedData = data as CorrectorCreatedNotification
        return this.groupIdToString('CM', typedData.activityId, userId)
      }

      case NotificationType.CORRECTION_PENDING: {
        const typedData = data as CorrectionPendingNotification
        return this.groupIdToString('CP', typedData.activityId, userId)
      }

      case NotificationType.CORRECTION_AVAILABLE: {
        const typedData = data as CorrectionAvailableNotification
        return this.groupIdToString('CA', typedData.activityId, userId)
      }

      case NotificationType.ACTIVITY_CLOSED: {
        const typedData = data as ActivityClosedNotification
        return this.groupIdToString('AC', typedData.activityId)
      }

      case NotificationType.RESOURCE_MOVED_BY_ADMIN: {
        const typedData = data as ResourceMovedByAdminNotification
        return this.groupIdToString('RMBA', typedData.resourceId)
      }

      case NotificationType.RESOURCE_INVITATION: {
        const typedData = data as ResourceInvitationNotification
        return this.groupIdToString('RI', typedData.resourceId)
      }

      case NotificationType.MEMBER_CREATE: {
        const typedData = data as ResourceEventNotification
        const eventInfo = typedData.eventInfo as unknown as ResourceMemberCreateEvent
        return this.groupIdToString('REMM', eventInfo?.resourceId, eventInfo?.data.userId)
      }

      case NotificationType.MEMBER_REMOVE: {
        const typedData = data as ResourceEventNotification
        const eventInfo = typedData.eventInfo as unknown as ResourceMemberRemoveEvent
        return this.groupIdToString('REMM', eventInfo?.resourceId, eventInfo?.actorId)
      }

      case NotificationType.RESOURCE_STATUS_CHANGE: {
        const typedData = data as ResourceEventNotification
        const eventInfo = typedData.eventInfo as unknown as ResourceStatusChangeEvent
        return this.groupIdToString('RERSC', eventInfo?.resourceId)
      }

      case NotificationType.RESOURCE_CREATE: {
        const typedData = data as ResourceEventNotification
        const eventInfo = typedData.eventInfo as unknown as ResourceCreateEvent
        return this.groupIdToString('RERC', eventInfo?.resourceId)
      }
      default:
        return null
    }
  }

  /** retrive the notification type from the notification data.
   * @param data the notification data with an 'type' field or an 'eventInfo' with an 'type' inside.
   * @return the NotificationType detected or raise an error if it's an unknown type.
   */
  private resolveNotificationType(data: Data): NotificationType {
    const raw = data['type'] === 'RESOURCE-EVENT' ? String(data['eventInfo']?.type).replace(/_/g, '-') : data['type']
    const type = raw as NotificationType
    if (!Object.values(NotificationType).includes(type)) {
      throw new Error(`Unknown type of notification : ${raw}`)
    }
    return type
  }

  private requireGroupId(type: NotificationType): boolean {
    const utilityTypes: string[] = [
      NotificationType.MODERATION_ACTIVITY_CHANGES,
      NotificationType.SESSION_STATE_CHANGES,
    ]
    return !utilityTypes.includes(type)
  }

  async sendToUser<T extends object>(
    userId: string,
    data: T,
    entityManager?: EntityManager
  ): Promise<NotificationEntity> {
    const type = this.resolveNotificationType(data)
    const groupId = this.resolveGroupId(type, userId, data)
    if (groupId === null && this.requireGroupId(type)) {
      this.logger.error(
        `Failed to send notification: Missing required parameters for type '${type}' and user '${userId}'. Data received: ${JSON.stringify(
          data
        )}`
      )
    }

    const completedData = { userId, data, type, groupId }

    const newNotification = entityManager
      ? await entityManager.save(entityManager.create(NotificationEntity, completedData))
      : await this.repository.save(this.repository.create(completedData))

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

  /** Give the date "months" ago from now
   * @param months  number of months to remove
   * @return the date it was "months" ago
   * */
  private limitDate(months: number): Date {
    const date = new Date()
    date.setMonth(date.getMonth() - months)
    return date
  }

  /**Regroup the notification by type to hide the similar ones
   * @param userId receive notification of this user
   * @param excludeUtility optional if set to true it removes all notifications types that are in HIDDEN_NOTIFICATION_TYPES
   * @Return the most recent for each group
   */
  private visibleQuery(userId: string, excludeUtility = false) {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.created_at > :maxAge', { maxAge: this.limitDate(MAX_AGE_MONTHS) }).andWhere(`NOT EXISTS (
        SELECT 1 FROM "Notifications" newer
        WHERE newer.user_id = notification.user_id
          AND newer.group_id = notification.group_id
          AND (newer.created_at, newer.id) > (notification.created_at, notification.id)
        )`)
    if (excludeUtility) {
      query.andWhere('notification.type NOT IN (:...hidden)', { hidden: HIDDEN_NOTIFICATION_TYPES })
    }
    return query
  }

  async ofUser(userId: string, filters: NotificationFilters = {}): Promise<[NotificationEntity[], number]> {
    // include all notification types even utility ones (those in HIDDEN_NOTIFICATION_TYPES)
    const excludeUtility = filters.excludeHidden ? filters.excludeHidden : false
    const query = this.visibleQuery(userId, excludeUtility).orderBy('notification.created_at', 'DESC')

    if (filters.unread) {
      query.andWhere('notification.read_at IS NULL')
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    if (filters.limit) {
      query.limit(filters.limit)
    }

    return query.getManyAndCount()
  }

  private SELECTED_OR_OLDER_IN_GROUP = `("Notifications"."id" IN (:...ids)
    OR EXISTS (
      SELECT 1 FROM "Notifications" target
      WHERE target."user_id" = :userId
      AND target."id" IN (:...ids)
      AND target."group_id" = "Notifications"."group_id"
      AND target."created_at" >= "Notifications"."created_at"
    )
    )
    `

  async markAsRead(userId: string, ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return
    }
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .andWhere(this.SELECTED_OR_OLDER_IN_GROUP, { ids })
      .execute()
    this.notifyUserAboutChanges(userId)
  }

  async markAsUnread(userId: string, ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return
    }
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
    if (!ids || ids.length === 0) {
      return 0
    }
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(NotificationEntity)
      .where('user_id = :userId', { userId })
      .andWhere(this.SELECTED_OR_OLDER_IN_GROUP, { ids })
      .execute()

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

  /** Return the number of unread notifications.
   * Notifications are regroupe by type. It count only one per group.
   * It doesn't take in count the notifications where the type is in HIDDEN_NOTIFICATION_TYPES
   */
  async unreadCount(userId: string): Promise<number> {
    return this.visibleQuery(userId, true).andWhere('notification.read_at IS NULL').getCount()
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

  /** Remove all notifications that are too old.
   */
  async deleteOldNotifications(): Promise<void> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(NotificationEntity)
      .where('created_at < :maxAge', { maxAge: this.limitDate(MAX_AGE_MONTHS) })
      .execute()

    this.logger.log(
      `Done deleting ${result.affected ?? 0} notifications that were created at least ${MAX_AGE_MONTHS} months ago`
    )
  }
}

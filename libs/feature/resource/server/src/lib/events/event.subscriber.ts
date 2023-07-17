import { Injectable } from '@nestjs/common'
import { NotificationService } from '@platon/feature/notification/server'
import { ResourceEventNotification, ResourceEventTypes } from '@platon/feature/resource/common'
import { DataSource, EntityManager, EntitySubscriberInterface, InsertEvent } from 'typeorm'
import { ResourceService } from '../resource.service'
import { ResourceEventEntity } from './event.entity'

type TargetUserProvider = (event: ResourceEventEntity, manager: EntityManager) => Promise<string[]>
type TargetUserProviderMap = Record<ResourceEventTypes, TargetUserProvider>

@Injectable()
export class ResourceEventSubscriber implements EntitySubscriberInterface<ResourceEventEntity> {
  private readonly defaultUserProvider: TargetUserProvider = async (event, manager) => {
    const users = await this.resourceService.notificationWatchers(event.resourceId, manager)
    return users.filter((u) => u !== event.actorId)
  }

  private readonly targetUserProviderMap: TargetUserProviderMap = {
    [ResourceEventTypes.MEMBER_CREATE]: this.defaultUserProvider.bind(this),
    [ResourceEventTypes.RESOURCE_CREATE]: this.defaultUserProvider.bind(this),
    [ResourceEventTypes.RESOURCE_STATUS_CHANGE]: this.defaultUserProvider.bind(this),
    [ResourceEventTypes.MEMBER_REMOVE]: async (event) => {
      return [event.actorId]
    },
  }

  constructor(
    private readonly dataSource: DataSource,
    private readonly resourceService: ResourceService,
    private readonly notificationService: NotificationService
  ) {
    this.dataSource.subscribers.push(this)
  }

  listenTo() {
    return ResourceEventEntity
  }

  async afterInsert(event: InsertEvent<ResourceEventEntity>): Promise<void> {
    if (event.entity) {
      this.notificationService.sendToAllUsers<ResourceEventNotification>(
        await this.targetUserProviderMap[event.entity.type](event.entity, event.manager),
        {
          type: 'RESOURCE-EVENT',
          eventInfo: {
            id: event.entity.id,
            type: event.entity.type,
            actorId: event.entity.actorId,
            resourceId: event.entity.resourceId,
            createdAt: event.entity.createdAt,
            data: event.entity.data,
          },
        }
      )
    }
  }
}

import GraphQLJSON from 'graphql-type-json'

import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'
import { BaseGraphModel, RelayConnection, toBoolean } from '@platon/core/server'
import { Notification, NotificationFilters, NotificationType } from '@platon/feature/notification/common'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsOptional } from 'class-validator'
import { NotificationEntity } from './notification.entity'

registerEnumType(NotificationType, {
  name: 'NotificationType',
})

@ObjectType('Notification')
export class NotificationGraphModel extends BaseGraphModel implements Notification {
  constructor(data: Partial<NotificationEntity>) {
    super()
    Object.assign(this, data)
  }

  @Field({ nullable: true })
  readAt?: Date

  @Field(() => GraphQLJSON)
  data!: Record<string, unknown>

  @Field(() => String, { nullable: true })
  groupId!: string | null

  @Field(() => NotificationType)
  @IsEnum(NotificationType)
  type!: NotificationType

  userId!: string
}

@ObjectType('NotificationConnection')
export class NotificationConnectionGraphModel extends RelayConnection(NotificationGraphModel) {}

@ObjectType('NotificationChange')
export class NotificationChangeGraphModel {
  constructor(data: Partial<NotificationChangeGraphModel>) {
    Object.assign(this, data)
  }

  @Field()
  unreadCount!: number

  @Field(() => NotificationGraphModel, { nullable: true })
  newNotification?: NotificationGraphModel

  @Field(() => [NotificationGraphModel], { nullable: true })
  notifications?: NotificationGraphModel[]
}

@InputType('NotificationFiltersInput')
export class NotificationFiltersInput implements NotificationFilters {
  @Field(() => Boolean, { nullable: true })
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  readonly unread?: boolean
}

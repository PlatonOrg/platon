import { BaseEntity, UserEntity } from '@platon/core/server'
import { NotificationType } from '@platon/feature/notification/common'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'

@Entity('Notifications')
@Index('Notifications_user_id_group_id_created_at_idx', ['userId', 'groupId', 'createdAt'])
@Index('Notifications_user_id_created_at_idx', ['userId', 'createdAt'])
export class NotificationEntity extends BaseEntity {
  @Index('Notifications_user_id_idx')
  @Column({ name: 'user_id' })
  userId!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Index('Notifications_read_at_idx')
  @Column({ name: 'read_at', nullable: true, type: 'timestamp with time zone' })
  readAt?: Date | null

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>

  @Column({ type: 'enum', enum: NotificationType, enumName: 'notification_type_enum' })
  type!: NotificationType

  @Column({ name: 'group_id', type: 'varchar', nullable: true })
  groupId!: string | null
}

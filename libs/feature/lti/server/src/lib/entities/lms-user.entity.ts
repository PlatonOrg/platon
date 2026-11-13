import { BaseEntity, UserEntity } from '@platon/core/server'
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'

/** An LMS user maps to a single PLaTon account (see `LmsUserService.findOrCreate`). */
export const LMS_USERS_UNIQUE_INDEX = 'LmsUsers_platform_user_unique_idx'

@Entity('LmsUsers')
@Unique(LMS_USERS_UNIQUE_INDEX, ['ltiPlatformId', 'lmsUserId'])
export class LmsUserEntity extends BaseEntity {
  @Column({ name: 'lms_user_id' })
  lmsUserId!: string

  @Column({ name: 'lti_platform_id', type: 'uuid' })
  ltiPlatformId!: string

  @Column({ name: 'user_id' })
  userId!: string

  @Column({ name: 'username', nullable: true })
  username!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity
}

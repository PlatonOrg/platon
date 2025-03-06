import { BaseEntity, UserEntity } from '@platon/core/server'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { LabelEntity } from '../label.entity'

@Entity('UserFavoriteLabels')
export class UserFavoriteLabel extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Column({ type: 'uuid' })
  labelId!: string

  @ManyToOne(() => LabelEntity)
  @JoinColumn({ name: 'label_id' })
  label!: LabelEntity
}

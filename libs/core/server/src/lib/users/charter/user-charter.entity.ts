import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../database'

@Entity('UserCharter')
export class UserCharterEntity extends BaseEntity {
  @Column({ name: 'accepted_user_charter', type: 'boolean', default: false })
  acceptedUserCharter!: boolean
}

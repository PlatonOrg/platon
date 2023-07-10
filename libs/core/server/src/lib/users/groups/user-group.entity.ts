import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm'
import { BaseEntity } from '../../database'
import { UserEntity } from '../user.entity'

@Entity('UserGroups')
export class UserGroupEntity extends BaseEntity {
  @Index('UserGroups_name_idx', { synchronize: false })
  @Column()
  name!: string

  @ManyToMany(() => UserEntity)
  @JoinTable({
    name: 'UserGroupsUsers',
    joinColumn: {
      name: 'group_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
  })
  users!: UserEntity[]
}

import { BaseEntity, UserEntity } from '@platon/core/server'
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { AiMessageEntity } from './ai-message.entity'

@Entity('AiChats')
export class AiChatEntity extends BaseEntity {
  @Index('idx_user_id')
  @Column({ name: 'user_id' })
  userId!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Column({ type: 'varchar', length: 127 })
  title!: string

  @OneToMany(() => AiMessageEntity, (message) => message.chat, { cascade: true })
  messages!: AiMessageEntity[]
}

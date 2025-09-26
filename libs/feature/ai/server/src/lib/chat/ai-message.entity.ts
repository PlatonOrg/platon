import { Entity, Index, Column, ManyToOne, JoinColumn } from 'typeorm'
import { AiChatEntity } from './ai-chat.entity'
import { BaseEntity } from '@platon/core/server'

@Entity('AiMessages')
export class AiMessageEntity extends BaseEntity {
  @Index('idx_chat_id')
  @Column({ name: 'chat_id' })
  chatId!: string

  @ManyToOne(() => AiChatEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: AiChatEntity

  @Column({ type: 'varchar', length: 15, nullable: false })
  role!: 'user' | 'ai'

  @Column({ type: 'text', nullable: false })
  content!: string
}

import { BaseEntity, UserEntity } from '@platon/core/server'
import { Feedback, FeedbackCategoryValue } from '@platon/feature/player/common'
import { SessionEntity } from '@platon/feature/result/server'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'

@Entity('Feedbacks')
export class FeedbackEntity extends BaseEntity implements Feedback {
  @Index('Feedbacks_session_id_idx')
  @Column({ name: 'session_id' })
  sessionId!: string

  @ManyToOne(() => SessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: SessionEntity

  @Column({ name: 'exercise_title', nullable: true })
  exerciseTitle?: string

  @Column({ name: 'sender_id', default: '00000000-0000-0000-0000-000000000000' })
  senderId!: string

  // @ts-expect-error: SET DEFAULT does not exist in OnDeleteType
  @ManyToOne(() => UserEntity, { onDelete: 'SET DEFAULT' })
  @JoinColumn({ name: 'sender_id' })
  sender!: UserEntity

  @Column({ name: 'creator_id', nullable: true })
  creatorId?: string

  @Column({ type: 'enum', enum: FeedbackCategoryValue })
  category!: FeedbackCategoryValue

  @Column({ type: 'text', nullable: true })
  message?: string
}

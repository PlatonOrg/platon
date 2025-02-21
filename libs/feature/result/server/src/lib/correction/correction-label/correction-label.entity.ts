import { CorrectionLabel } from '@platon/feature/result/common'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { BaseEntity } from '@platon/core/server'
import { LabelEntity } from '../../label/label.entity'
import { SessionEntity } from '../../sessions/session.entity'
import { AnswerEntity } from '../../answers/answer.entity'

@Entity('CorrectionLabels')
export class CorrectionLabelEntity extends BaseEntity implements CorrectionLabel {
  @Column({ name: 'label_id', type: 'uuid' })
  labelId!: string

  @ManyToOne(() => LabelEntity)
  @JoinColumn({ name: 'label_id' })
  label!: string

  @Column({ name: 'session_id' })
  sessionId!: string

  @ManyToOne(() => SessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: SessionEntity

  @Column({ name: 'answer_id' })
  answerId!: string

  @ManyToOne(() => AnswerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'answer_id' })
  answer!: AnswerEntity
}

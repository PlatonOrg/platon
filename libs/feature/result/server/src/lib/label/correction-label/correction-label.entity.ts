import { CorrectionLabel } from '@platon/feature/result/common'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { BaseEntity } from '@platon/core/server'
import { LabelEntity } from '../label.entity'
import { SessionEntity } from '../../sessions/session.entity'
import { AnswerEntity } from '../../answers/answer.entity'
import { ResourceLabelEntity } from '../resource-label/resource-label.entity'
import { CorrectionEntity } from '../../correction/correction.entity'

@Entity('CorrectionLabels')
export class CorrectionLabelEntity extends BaseEntity implements CorrectionLabel {
  @Column({ name: 'label_id', type: 'uuid' })
  labelId!: string

  @ManyToOne(() => LabelEntity)
  @JoinColumn({ name: 'label_id' })
  label!: string

  /**
   * Represent the exercise session in navigation
   */
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

  @Column({ name: 'resource_label_id', type: 'uuid', nullable: true })
  resourceLabelId?: string

  @ManyToOne(() => ResourceLabelEntity)
  @JoinColumn({ name: 'resource_label_id' })
  resourceLabel?: ResourceLabelEntity

  @Column({ name: 'correction_id', type: 'uuid', nullable: false })
  correctionId!: string

  @ManyToOne(() => CorrectionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'correction_id' })
  correction!: CorrectionLabelEntity
}

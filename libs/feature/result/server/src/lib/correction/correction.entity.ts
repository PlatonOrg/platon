/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEntity, UserEntity } from '@platon/core/server'
import { Correction } from '@platon/feature/result/common'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'

@Entity('Corrections')
export class CorrectionEntity extends BaseEntity implements Correction {
  @Column({ name: 'author_id', default: '00000000-0000-0000-0000-000000000000' })
  authorId!: string

  // @ts-expect-error: SET DEFAULT does not exist in OnDeleteType
  @ManyToOne(() => UserEntity, { onDelete: 'SET DEFAULT' })
  @JoinColumn({ name: 'author_id' })
  author!: UserEntity

  @Column({ type: 'float' })
  grade!: number
}

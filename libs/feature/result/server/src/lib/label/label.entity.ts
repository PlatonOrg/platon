import { BaseEntity } from '@platon/core/server'
import { Column, Entity } from 'typeorm'

@Entity('Labels')
export class LabelEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  color?: string
}

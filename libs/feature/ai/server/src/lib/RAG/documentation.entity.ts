import { BaseEntity } from '@platon/core/server'
import { AiMetadata } from '@platon/feature/ai/common'
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm'

@Entity('Documentation')
export class DocumentationEntity extends BaseEntity {
  @Column({ type: 'text', nullable: false })
  content!: string

  @Column('vector')
  embedding!: number[]

  @Column({ type: 'jsonb', nullable: true })
  metadata?: AiMetadata

  @BeforeUpdate()
  @BeforeInsert()
  stringifyVector() {
    if (this.embedding && Array.isArray(this.embedding)) {
      this.embedding = JSON.stringify(this.embedding) as never
    }
  }
}

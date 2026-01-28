import { BaseEntity, UserEntity } from '@platon/core/server'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { SessionEntity } from '../sessions/session.entity'
import { StudentSubmission } from '@platon/feature/result/common'

export type SubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed'

@Entity('StudentSubmissions')
@Index('StudentSubmissions_session_user_idx', ['sessionId', 'userId'])
export class StudentSubmissionEntity extends BaseEntity implements StudentSubmission {
  @Index('StudentSubmissions_session_idx')
  @Column({ name: 'session_id' })
  sessionId!: string

  @ManyToOne(() => SessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: SessionEntity

  @Index('StudentSubmissions_user_idx')
  @Column({ name: 'user_id' })
  userId!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Column()
  fileName!: string

  @Column()
  fileSize!: number

  @Column()
  mimeType!: string

  @Column()
  filePath!: string

  @Column({ type: 'int', default: 1 })
  version!: number

  @Column({ type: 'varchar', default: 'completed', length: 20 })
  status!: SubmissionStatus

  @Column({ nullable: true })
  checksum?: string

  @Column({ type: 'timestamp with time zone', name: 'uploaded_at' })
  uploadedAt!: Date

  @Column({ type: 'timestamp with time zone', name: 'submitted_at', nullable: true })
  submittedAt?: Date | null

  @Column({ type: 'text', nullable: true })
  comment?: string | null

  async getContent(): Promise<Buffer> {
    const fs = await import('fs/promises')
    return fs.readFile(this.filePath)
  }
}

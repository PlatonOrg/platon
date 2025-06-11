import { BaseEntity } from '@platon/core/server';
import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('error_record')
export class ErrorRecord extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 64 })
  errorHash!: string;

  @Column()
  subject!: string;

  @CreateDateColumn()
  firstOccurrence!: Date;

  @UpdateDateColumn()
  lastOccurrence!: Date;

  @Column({ default: 1 })
  occurrenceCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationSent!: Date;
}

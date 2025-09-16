/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEntity, UserEntity } from '@platon/core/server'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CourseMemberEntity } from '@platon/feature/course/server'

@Entity('TestsCandidates')
export class TestsCandidatesEntity extends BaseEntity {
  @Index('TestsCandidates_user_id_idx')
  @Column({ name: 'user_id' })
  userId!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Index('TestsCandidates_courseMember_id_idx')
  @Column({ name: 'course_member_id' })
  courseMemberId!: string

  @ManyToOne(() => CourseMemberEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_member_id' })
  courseMember!: CourseMemberEntity

  @Column({ name: 'link_id' })
  linkId!: string
}

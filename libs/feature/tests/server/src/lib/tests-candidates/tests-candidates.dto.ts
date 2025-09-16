import { ApiProperty } from '@nestjs/swagger'
import { BaseDTO } from '@platon/core/server'
import { IsString, IsUUID } from 'class-validator'
import { CreateTestsCandidates, TestsCandidates } from '@platon/feature/tests/common'

export class TestsCandidatesDTO extends BaseDTO implements TestsCandidates {
  @IsUUID()
  @ApiProperty()
  readonly userId!: string

  @IsUUID()
  @ApiProperty()
  readonly courseMemberId!: string

  @IsString()
  @ApiProperty()
  readonly linkId!: string
}

export class CreateTestsCandidatesDTO implements CreateTestsCandidates {
  @IsUUID()
  @ApiProperty()
  readonly userId!: string

  @IsUUID()
  @ApiProperty()
  readonly courseMemberId!: string
}

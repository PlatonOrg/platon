import { ApiProperty } from '@nestjs/swagger'
import { BaseDTO } from '@platon/core/server'
import { CreateTest, EditorJsData, Test } from '@platon/feature/tests/common'
import { IsUUID } from 'class-validator'

export class TestDTO extends BaseDTO implements Test {
  @IsUUID()
  @ApiProperty()
  readonly courseId!: string

  @ApiProperty()
  readonly terms!: EditorJsData

  @ApiProperty()
  readonly mailContent!: EditorJsData

  @ApiProperty()
  readonly mailSubject!: string
}

export class CreateTestDTO implements CreateTest {
  @IsUUID()
  @ApiProperty()
  readonly courseId!: string
}

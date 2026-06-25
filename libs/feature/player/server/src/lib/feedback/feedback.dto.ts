import { ApiProperty } from '@nestjs/swagger'
import { Feedback, FeedbackCategoryValue } from '@platon/feature/player/common'
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

export class FeedbackDTO implements Feedback {
  @IsUUID()
  @ApiProperty()
  sessionId!: string

  @IsString()
  @ApiProperty()
  exerciseTitle?: string

  @IsEnum(FeedbackCategoryValue)
  @ApiProperty({ enum: FeedbackCategoryValue })
  category!: FeedbackCategoryValue

  @IsString()
  @ApiProperty()
  @IsOptional()
  message?: string
}

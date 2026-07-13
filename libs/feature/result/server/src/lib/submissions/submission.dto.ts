import { PickType } from '@nestjs/swagger'
import { IsOptional, IsString, IsNumber } from 'class-validator'
import { StudentSubmissionEntity } from './submission.entity'

export class SubmissionReadDTO extends PickType(StudentSubmissionEntity, [
  'id',
  'sessionId',
  'userId',
  'fileName',
  'fileSize',
  'mimeType',
  'version',
  'status',
  'uploadedAt',
  'submittedAt',
  'comment',
] as const) {}

export class SubmissionCreateDTO {
  @IsOptional()
  @IsString()
  comment?: string
}

export class SubmissionListDTO {
  @IsString()
  sessionId!: string

  @IsOptional()
  @IsNumber()
  limit?: number

  @IsOptional()
  @IsNumber()
  offset?: number

  @IsOptional()
  @IsString()
  userId?: string
}

export class SubmissionDownloadDTO {
  @IsString()
  submissionId!: string

  @IsOptional()
  @IsNumber()
  version?: number
}

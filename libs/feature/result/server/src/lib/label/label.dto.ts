import { BaseDTO } from '@platon/core/server'
import { Label } from '@platon/feature/result/common'
import { IsString, IsUUID } from 'class-validator'

export class LabelDTO extends BaseDTO implements Label {
  @IsUUID()
  id!: string

  @IsString()
  name!: string

  @IsString()
  description?: string

  @IsString()
  color?: string

  @IsString()
  gradeChange?: string
}

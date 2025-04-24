import { UserCharter } from '@platon/core/common'
import { BaseDTO } from '../../utils'
import { IsBoolean, IsOptional } from 'class-validator'

export class userCharterDTO extends BaseDTO implements UserCharter {
  @IsBoolean()
  @IsOptional()
  readonly acceptedUserCharter?: boolean
}

import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ItemResponse } from '@platon/core/common'

import { UserCharterService } from './user-charter.service'
import { userCharterDTO } from './user-charter.dto'
import { Mapper } from '../../utils'

@ApiBearerAuth()
@Controller('user-charter')
@ApiTags('Users')
export class UserCharterController {
  constructor(private readonly userCharterService: UserCharterService) {}

  @Post('accept')
  async acceptUserCharter(@Body('userId') userId: string): Promise<ItemResponse<userCharterDTO>> {
    const resource = Mapper.map(await this.userCharterService.acceptUserCharter(userId), userCharterDTO)
    return new ItemResponse({
      resource,
    })
  }

  @Get(':userId')
  async findUserCharterById(@Param('userId') userId: string): Promise<ItemResponse<userCharterDTO>> {
    const resource = Mapper.map(await this.userCharterService.findUserCharterById(userId), userCharterDTO)
    return new ItemResponse({
      resource,
    })
  }
}

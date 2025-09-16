import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CreatedResponse, ItemResponse, UserRoles } from '@platon/core/common'
import { IRequest, Mapper, Public, Roles } from '@platon/core/server'
import { TestsCandidatesService } from './tests-candidates.service'
import { CreateTestsCandidatesDTO, TestsCandidatesDTO } from './tests-candidates.dto'
import { CandidateSignInResponse } from '@platon/feature/tests/common'

@ApiBearerAuth()
@Controller('tests-candidates')
@ApiTags('Tests')
export class TestsCandidatesController {
  constructor(private readonly testsCandidatesService: TestsCandidatesService) {}

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post('create-many')
  async createMany(
    @Req() req: IRequest,
    @Body() inputs: CreateTestsCandidatesDTO[]
  ): Promise<CreatedResponse<TestsCandidatesDTO[]>> {
    const resources = (await this.testsCandidatesService.createMany(inputs)).map((resource) =>
      Mapper.map(resource, TestsCandidatesDTO)
    )
    return new CreatedResponse({ resource: resources })
  }

  @Public()
  @Post('sign-in-with-invitation')
  async signInWithInvitation(
    @Req() req: IRequest,
    @Body('invitationId') invitationId: string
  ): Promise<ItemResponse<CandidateSignInResponse>> {
    const token = await this.testsCandidatesService.signInWithInvitation(invitationId)
    return new ItemResponse({ resource: token })
  }
}

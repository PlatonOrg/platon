import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { TestService } from './test.service'
import { IRequest, Mapper, Roles } from '@platon/core/server'
import { CreatedResponse, ItemResponse, NotFoundResponse, UserRoles } from '@platon/core/common'
import { CreateTestDTO, TestDTO } from './test.dto'
import { EditorJsData, UpdateTestMailContentInput, UpdateTestTermsInput } from '@platon/feature/tests/common'

@Controller('test')
@ApiTags('Tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post('create')
  async createTest(@Req() req: IRequest, @Body() input: CreateTestDTO): Promise<CreatedResponse<TestDTO>> {
    const test = await this.testService.createTest(input)
    return new CreatedResponse({ resource: test })
  }

  @Get('course/:courseId')
  async getTestByCourseId(@Req() req: IRequest, @Param('courseId') courseId: string): Promise<ItemResponse<TestDTO>> {
    const optional = await this.testService.getTestByCourseId(courseId)
    const test = Mapper.map(
      optional.orElseThrow(() => new NotFoundResponse(`Test not found: ${courseId}`)),
      TestDTO
    )
    return new ItemResponse<TestDTO>({ resource: test })
  }

  @Get(':testId/completed-terms')
  async getCompletedTestTerms(
    @Req() req: IRequest,
    @Param('testId') testId: string
  ): Promise<ItemResponse<EditorJsData>> {
    const terms = await this.testService.getCompletedTestTerms(testId, req.user)
    return new ItemResponse<EditorJsData>({ resource: terms })
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post(':testId/terms')
  async updateTestTerms(
    @Req() req: IRequest,
    @Param('testId') testId: string,
    @Body() input: UpdateTestTermsInput
  ): Promise<void> {
    await this.testService.updateTestTerms(testId, input.terms)
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post(':testId/mail-content')
  async updateTestMailContent(
    @Req() req: IRequest,
    @Param('testId') testId: string,
    @Body() input: UpdateTestMailContentInput
  ): Promise<void> {
    await this.testService.updateTestMailContent(testId, input.mailContent, input.mailSubject)
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post(':testId/send-all-mails')
  async sendAllMails(
    @Headers('origin') origin: string,
    @Req() req: IRequest,
    @Param('testId') testId: string
  ): Promise<void> {
    await this.testService.sendAllMails(testId, origin, req.user)
  }

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post(':testId/send-mail/:courseMemberId')
  async sendMailToCandidate(
    @Headers('origin') origin: string,
    @Req() req: IRequest,
    @Param('testId') testId: string,
    @Param('courseMemberId') courseMemberId: string
  ): Promise<void> {
    await this.testService.sendMailToCandidate(testId, courseMemberId, origin, req.user)
  }
}

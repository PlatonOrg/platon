import { Body, Controller, Logger, Post, Req } from '@nestjs/common'
import { FeedbackService } from './feedback.service'
import { IRequest, Roles } from '@platon/core/server'
import { FeedbackDTO } from './feedback.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

@ApiBearerAuth()
@Controller('player/feedback')
@ApiTags('Players')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name)
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Roles('admin', 'teacher', 'student', 'candidate')
  async submitFeedback(@Req() req: IRequest, @Body() feedback: FeedbackDTO): Promise<void> {
    await this.feedbackService.submitFeedback(feedback, req.user.id)
    this.logger.debug(`Feedback received from ${req.user.id} for session ${feedback.sessionId}.`)
  }
}

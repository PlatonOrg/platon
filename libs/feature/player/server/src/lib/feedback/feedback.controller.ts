import { Body, Controller, Post, Req } from '@nestjs/common'
import { FeedbackService } from './feedback.service'
import { IRequest } from '@platon/core/server'
import { FeedbackDTO } from './feedback.dto'

@Controller('player/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(@Req() req: IRequest, @Body() feedback: FeedbackDTO): Promise<void> {}
}

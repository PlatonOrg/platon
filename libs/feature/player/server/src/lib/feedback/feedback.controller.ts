import { Controller, Post } from '@nestjs/common'
import { FeedbackService } from './feedback.service'

@Controller('player/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(): Promise<void> {}
}

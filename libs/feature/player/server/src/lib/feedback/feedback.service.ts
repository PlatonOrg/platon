import { Injectable } from '@nestjs/common'
import { EmailService } from '@platon/feature/email/server'

@Injectable()
export class FeedbackService {
  constructor(private readonly emailService: EmailService) {}
}

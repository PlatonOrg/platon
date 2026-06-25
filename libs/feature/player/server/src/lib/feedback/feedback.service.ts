import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EmailService } from '@platon/feature/email/server'
import { FeedbackEntity } from './feedback.entity'
import { Repository } from 'typeorm'
import { FeedbackDTO } from './feedback.dto'
import { UserService } from '@platon/core/server'
import { SessionEntity } from '@platon/feature/result/server'

type projection = {
  creatorId: string
  firstName: string
  lastName: string
  email: string
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name)

  constructor(
    @InjectRepository(FeedbackEntity) private readonly feedbackRepository: Repository<FeedbackEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly emailService: EmailService,
    private readonly userService: UserService
  ) {}

  async submitFeedback(input: FeedbackDTO, senderId: string): Promise<void> {
    const queryText = `SELECT users.id AS "creatorId", first_name AS "firstName", last_name AS "lastName", email
      FROM Sessions sessions
      INNER JOIN Activities activities ON sessions.activity_id = activities.id
      INNER JOIN Users users ON activities.creator_id = users.id
      WHERE sessions.id = $1
    `
    const creator: projection = await this.sessionRepository.query(queryText, [input.sessionId])
    const feedbackEntity = this.feedbackRepository.create({
      ...input,
      creatorId: creator.creatorId,
      senderId: senderId,
    })
    this.logger.log(
      `Feedback received from ${feedbackEntity.senderId} for session ${feedbackEntity.sessionId}. Sending email to ${creator.email}`
    )
    // await this.feedbackRepository.save(feedbackEntity)
  }
}

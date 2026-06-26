import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EmailService } from '@platon/feature/email/server'
import { FeedbackCategoryValue, getFeedbackCategoryLabel } from '@platon/feature/player/common'
import { FeedbackEntity } from './feedback.entity'
import { Repository } from 'typeorm'
import { FeedbackDTO } from './feedback.dto'
import { SessionEntity } from '@platon/feature/result/server'

type projection = {
  creatorId: string
  firstName: string
  lastName: string
  email: string
}

enum FeedbackRecipient {
  CREATOR = 'creator',
  PLATON_TEAM = 'platon_team',
}

// Détermine qui doit être notifié selon la nature du problème signalé :
// le créateur de l'activité/exercice peut seul corriger le contenu, l'équipe PLaTOn
// gère ce qui relève de la plateforme. L'accessibilité peut relever des deux.
const FEEDBACK_RECIPIENTS: Record<FeedbackCategoryValue, FeedbackRecipient[]> = {
  [FeedbackCategoryValue.STATEMENT]: [FeedbackRecipient.CREATOR],
  [FeedbackCategoryValue.ANSWER]: [FeedbackRecipient.CREATOR],
  [FeedbackCategoryValue.ACCESSIBILITY]: [FeedbackRecipient.CREATOR, FeedbackRecipient.PLATON_TEAM],
  [FeedbackCategoryValue.TECHNICAL]: [FeedbackRecipient.PLATON_TEAM],
  [FeedbackCategoryValue.OTHER]: [FeedbackRecipient.PLATON_TEAM],
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name)

  constructor(
    @InjectRepository(FeedbackEntity) private readonly feedbackRepository: Repository<FeedbackEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly emailService: EmailService
  ) {}

  async submitFeedback(input: FeedbackDTO, senderId: string): Promise<void> {
    const queryText = `
    SELECT
      COALESCE(session_data.activity_creator_id, session_data.resource_owner_id, session_data.course_owner_id) AS "creatorId",
      users.first_name AS "firstName",
      users.last_name AS "lastName",
      users.email
    FROM "SessionData" session_data
    INNER JOIN "Users" users
      ON users.id = COALESCE(session_data.activity_creator_id, session_data.resource_owner_id, session_data.course_owner_id)
    WHERE session_data.id = $1
  `
    const [resourceCreator]: projection[] = await this.sessionRepository.query(queryText, [input.sessionId])

    if (!resourceCreator) {
      this.logger.error(
        `No creator found for session ${input.sessionId} since activity is not found or creator is not found.`
      )
      throw new Error(`No creator found for session ${input.sessionId}.`)
    }
    const feedbackEntity = this.feedbackRepository.create({
      ...input,
      creatorId: resourceCreator.creatorId,
      senderId: senderId,
    })

    const categoryLabel = getFeedbackCategoryLabel(input.category)
    const subject = `[Signalement PLaTOn] ${input.exerciseTitle ?? 'Exercice'} - ${categoryLabel}`
    const content = [
      'Un signalement a été soumis sur PLaTOn.',
      '',
      `Exercice : ${input.exerciseTitle ?? 'N/A'}`,
      `Catégorie : ${categoryLabel}`,
      'Message :',
      input.message ?? '(aucun message)',
    ].join('\n')

    const recipients = FEEDBACK_RECIPIENTS[input.category]

    if (recipients.includes(FeedbackRecipient.CREATOR)) {
      await this.emailService.send({ to: resourceCreator.email, subject, text: content })
    }
    if (recipients.includes(FeedbackRecipient.PLATON_TEAM)) {
      await this.emailService.sendToPlatonTeam({ subject, text: content })
    }

    await this.feedbackRepository.save(feedbackEntity)

    const notified = recipients.join(', ')
    this.logger.log(
      `Feedback from ${senderId} for session ${input.sessionId} (${input.category}): notified ${notified}.`
    )
  }
}

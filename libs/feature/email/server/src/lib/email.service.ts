import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigService } from '@nestjs/config'
import { ErrorTrackingService } from './error-tracking.service'

/**
 * Type représentant les options pour l'envoi d'un e-mail
 */
export interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

/**
 * Type représentant les options pour l'envoi d'un e-mail technique
 */
export interface TechnicalEmailOptions {
  subject: string
  content: string
  error?: Error | unknown
}

/**
 * Service responsable de l'envoi d'e-mails
 * Permet d'envoyer des e-mails aux utilisateurs et à l'équipe technique
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly transporter?: nodemailer.Transporter
  private readonly technicalTeamEmail: string[]
  private readonly fromEmail: string
  private readonly isConfigured: boolean

  constructor(
    private readonly configService: ConfigService,
    private readonly errorTrackingService: ErrorTrackingService
  ) {
    const host = this.configService.get<string>('EMAIL_HOST')
    const port = this.configService.get<number>('EMAIL_PORT')
    const user = this.configService.get<string>('EMAIL_USER')
    const password = this.configService.get<string>('EMAIL_PASSWORD')

    // Vérifier si la configuration email est disponible
    this.isConfigured = Boolean(host && port)

    if (this.isConfigured) {
      // Configuration du transporteur d'e-mails
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: this.configService.get<boolean>('EMAIL_SECURE', false),
        auth: {
          user,
          pass: password,
        },
      })
      this.logger.log('Service d\'e-mail configuré avec succès')
    } else {
      this.logger.warn('Configuration du service d\'e-mail absente ou incomplète. Les e-mails ne seront pas envoyés.')
    }

    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'ne-pas-repondre@platon.univ-eiffel.fr')
    this.technicalTeamEmail = this.configService.get<string[]>('EMAIL_TECHNICAL_TEAM', [])
  }

  /**
   * Envoie un e-mail
   * @param options Les options de l'e-mail
   * @returns Promise<boolean> true si l'envoi a réussi, false sinon
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.error(`Impossible d'envoyer l'e-mail à ${options.to} : service non configuré`, options)
      return false
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      }

      await this.transporter.sendMail(mailOptions)
      this.logger.log(`E-mail envoyé à ${options.to}`)
      return true
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'e-mail à ${options.to}`, error)
      return false
    }
  }

  /**
   * Envoie un e-mail à l'équipe technique
   * @param options Les options de l'e-mail technique
   * @returns Promise<boolean> true si l'envoi a réussi, false sinon
   */
  async sendTechnicalAlert(options: TechnicalEmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.technicalTeamEmail.length) {
      this.logger.error(
        `Impossible d'envoyer l'alerte technique "${options.subject}" : service non configuré`,
        options.error || 'Pas de détails d\'erreur'
      )
      return false
    }

    // Vérifier si on doit envoyer cette alerte SANS l'enregistrer comme envoyée
    const shouldSend = await this.errorTrackingService.shouldSendAlertWithoutRecording(
      options.subject,
      options.error,
      60 // throttle de 60 minutes
    );

    if (!shouldSend) {
      this.logger.log(`Alerte "${options.subject}" ignorée (déjà notifiée récemment)`);
      return true; // Considéré comme un succès car l'alerte n'avait pas besoin d'être envoyée
    }

    // Récupérer le nombre d'occurrences pour inclure dans le mail
    const occurrenceCount = await this.errorTrackingService.getErrorOccurrenceCount(
      options.subject,
      options.error
    );

    let content = options.content;
    if (occurrenceCount > 1) {
      content = `Cette erreur s'est produite ${occurrenceCount} fois.\n\n${content}`;
    }

    if (options.error) {
      const errorDetails = typeof options.error === 'object'
        ? JSON.stringify(options.error, Object.getOwnPropertyNames(options.error), 2)
        : String(options.error)
      content += `\n\nDétails de l'erreur:\n${errorDetails}`;
    }

    const emailSent = await this.send({
      to: this.technicalTeamEmail,
      subject: `[PLATON_ERROR] ${options.subject}`,
      text: content,
    });

    if (emailSent) {
      // Marquer l'alerte comme envoyée avec succès
      await this.errorTrackingService.markAlertAsSent(options.subject, options.error);
      this.logger.log(`Alerte technique "${options.subject}" envoyée avec succès`);
    } else {
      // En cas d'échec, on peut réinitialiser le timestamp pour permettre un nouvel essai
      await this.errorTrackingService.resetLastNotificationTimestamp(options.subject, options.error);
      this.logger.error(`Échec de l'envoi de l'alerte technique "${options.subject}"`);
    }

    return emailSent;
  }
}

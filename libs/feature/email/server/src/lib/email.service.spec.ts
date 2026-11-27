import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import { ErrorTrackingService } from './error-tracking.service'
import { EmailService } from './email.service'

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}))

describe('EmailService', () => {
  let sendMail: jest.Mock
  let errorTrackingService: jest.Mocked<
    Pick<
      ErrorTrackingService,
      | 'shouldSendAlertWithoutRecording'
      | 'getErrorOccurrenceCount'
      | 'markAlertAsSent'
      | 'resetLastNotificationTimestamp'
    >
  >

  const buildConfigService = (overrides: Record<string, unknown> = {}): ConfigService => {
    const values: Record<string, unknown> = {
      'mail.host': 'smtp.test.local',
      'mail.port': 587,
      'mail.user': 'user',
      'mail.password': 'password',
      'mail.tlsRejectUnauthorized': true,
      'mail.secure': false,
      'mail.from': 'ne-pas-repondre@platon.univ-eiffel.fr',
      'mail.technicalTeam': ['tech@platon.test'],
      ...overrides,
    }
    return {
      get: jest.fn((key: string, def?: unknown) => (key in values ? values[key] : def)),
    } as unknown as ConfigService
  }

  const buildService = async (configOverrides: Record<string, unknown> = {}): Promise<EmailService> => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: buildConfigService(configOverrides) },
        { provide: ErrorTrackingService, useValue: errorTrackingService },
      ],
    }).compile()

    return module.get(EmailService)
  }

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue(undefined)
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail })
    errorTrackingService = {
      shouldSendAlertWithoutRecording: jest.fn().mockResolvedValue(true),
      getErrorOccurrenceCount: jest.fn().mockResolvedValue(1),
      markAlertAsSent: jest.fn().mockResolvedValue(undefined),
      resetLastNotificationTimestamp: jest.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('configuration', () => {
    it('devrait configurer un transporteur nodemailer quand host/port sont fournis', async () => {
      await buildService()

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'smtp.test.local', port: 587 })
      )
    })

    it('ne devrait pas configurer de transporteur si host/port sont absents', async () => {
      await buildService({ 'mail.host': undefined, 'mail.port': undefined })

      expect(nodemailer.createTransport).not.toHaveBeenCalled()
    })
  })

  describe('send', () => {
    it("devrait retourner false sans tenter d'envoyer si le service n'est pas configuré", async () => {
      const service = await buildService({ 'mail.host': undefined, 'mail.port': undefined })

      const result = await service.send({ to: 'a@test.local', subject: 'Subject' })

      expect(result).toBe(false)
      expect(sendMail).not.toHaveBeenCalled()
    })

    it('devrait envoyer le mail avec les options fournies et retourner true', async () => {
      const service = await buildService()

      const result = await service.send({ to: 'a@test.local', subject: 'Subject', html: '<p>hi</p>' })

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'ne-pas-repondre@platon.univ-eiffel.fr',
          to: 'a@test.local',
          subject: 'Subject',
          html: '<p>hi</p>',
        })
      )
      expect(result).toBe(true)
    })

    it('devrait retourner false si nodemailer lève une exception', async () => {
      sendMail.mockRejectedValue(new Error('smtp down'))
      const service = await buildService()

      const result = await service.send({ to: 'a@test.local', subject: 'Subject' })

      expect(result).toBe(false)
    })
  })

  describe('sendToPlatonTeam', () => {
    it("devrait retourner false si l'équipe technique n'est pas configurée", async () => {
      const service = await buildService({ 'mail.technicalTeam': [] })

      const result = await service.sendToPlatonTeam({ subject: 'Subject', text: 'content' })

      expect(result).toBe(false)
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("devrait envoyer à l'équipe technique résolue automatiquement", async () => {
      const service = await buildService({ 'mail.technicalTeam': ['a@platon.test', 'b@platon.test'] })

      const result = await service.sendToPlatonTeam({ subject: 'Subject', text: 'content' })

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ['a@platon.test', 'b@platon.test'], subject: 'Subject' })
      )
      expect(result).toBe(true)
    })
  })

  describe('sendTechnicalAlert', () => {
    it("devrait retourner false si l'équipe technique n'est pas configurée", async () => {
      const service = await buildService({ 'mail.technicalTeam': [] })

      const result = await service.sendTechnicalAlert({ subject: 'Subject', content: 'content' })

      expect(result).toBe(false)
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("ne devrait pas envoyer si l'alerte est throttlée, mais retourner true", async () => {
      errorTrackingService.shouldSendAlertWithoutRecording.mockResolvedValue(false)
      const service = await buildService()

      const result = await service.sendTechnicalAlert({ subject: 'Subject', content: 'content' })

      expect(sendMail).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it("devrait envoyer l'alerte avec le nombre d'occurrences et les détails de l'erreur, puis marquer comme envoyée", async () => {
      errorTrackingService.getErrorOccurrenceCount.mockResolvedValue(3)
      const service = await buildService()

      const result = await service.sendTechnicalAlert({
        subject: 'Subject',
        content: 'content',
        error: new Error('boom'),
      })

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[PLATON_ERROR] Subject',
          text: expect.stringContaining("s'est produite 3 fois"),
        })
      )
      expect(sendMail.mock.calls[0][0].text).toContain("Détails de l'erreur")
      expect(errorTrackingService.markAlertAsSent).toHaveBeenCalledWith('Subject', expect.any(Error))
      expect(result).toBe(true)
    })

    it("ne devrait pas préfixer le contenu si l'erreur ne s'est produite qu'une fois", async () => {
      errorTrackingService.getErrorOccurrenceCount.mockResolvedValue(1)
      const service = await buildService()

      await service.sendTechnicalAlert({ subject: 'Subject', content: 'content' })

      expect(sendMail.mock.calls[0][0].text).not.toContain("s'est produite")
    })

    it("devrait réinitialiser le timestamp si l'envoi échoue", async () => {
      sendMail.mockRejectedValue(new Error('smtp down'))
      const service = await buildService()

      const result = await service.sendTechnicalAlert({ subject: 'Subject', content: 'content' })

      expect(errorTrackingService.resetLastNotificationTimestamp).toHaveBeenCalledWith('Subject', undefined)
      expect(errorTrackingService.markAlertAsSent).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })
})

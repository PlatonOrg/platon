import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { ErrorRecord } from './entities/error-record.entity'
import { ErrorTrackingService } from './error-tracking.service'

describe('ErrorTrackingService', () => {
  let service: ErrorTrackingService
  let repository: MockRepository<ErrorRecord>

  beforeEach(async () => {
    repository = mockRepository<ErrorRecord>()

    const module = await Test.createTestingModule({
      providers: [ErrorTrackingService, { provide: getRepositoryToken(ErrorRecord), useValue: repository }],
    }).compile()

    service = module.get(ErrorTrackingService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('shouldSendAlert', () => {
    it('devrait créer un enregistrement et retourner true pour une nouvelle erreur', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.shouldSendAlert('Subject', new Error('boom'))

      expect(result).toBe(true)
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Subject', occurrenceCount: 1 }))
    })

    it("devrait retourner false et incrémenter le compteur si le throttle n'est pas écoulé", async () => {
      const lastNotificationSent = new Date(Date.now() - 5 * 60 * 1000)
      repository.findOne.mockResolvedValue({
        errorHash: 'hash',
        occurrenceCount: 1,
        lastOccurrence: new Date(0),
        lastNotificationSent,
      } as ErrorRecord)

      const result = await service.shouldSendAlert('Subject', new Error('boom'), 60)

      expect(result).toBe(false)
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ occurrenceCount: 2, lastNotificationSent })
      )
    })

    it('devrait retourner true et rafraîchir lastNotificationSent si le throttle est écoulé', async () => {
      const lastNotificationSent = new Date(Date.now() - 120 * 60 * 1000)
      repository.findOne.mockResolvedValue({
        errorHash: 'hash',
        occurrenceCount: 1,
        lastOccurrence: new Date(0),
        lastNotificationSent,
      } as ErrorRecord)

      const result = await service.shouldSendAlert('Subject', new Error('boom'), 60)

      expect(result).toBe(true)
      const saved = repository.save.mock.calls[0][0] as ErrorRecord
      expect(saved.lastNotificationSent).not.toEqual(lastNotificationSent)
    })

    it("devrait générer le même hash pour la même instance d'erreur (dédoublonnage)", async () => {
      // On réutilise la même instance : le hash inclut la stack trace complète
      // (Object.getOwnPropertyNames(error)), donc deux `new Error()` à des lignes
      // différentes produiraient des hashs différents même avec le même message.
      const error = new Error('boom')
      repository.findOne.mockResolvedValue(null)
      await service.shouldSendAlert('Subject', error)
      const firstHash = repository.save.mock.calls[0][0].errorHash

      repository.findOne.mockResolvedValue(null)
      await service.shouldSendAlert('Subject', error)
      const secondHash = repository.save.mock.calls[1][0].errorHash

      expect(firstHash).toBe(secondHash)
    })

    it('devrait générer des hashs différents pour des erreurs différentes', async () => {
      repository.findOne.mockResolvedValue(null)
      await service.shouldSendAlert('Subject', new Error('boom'))
      const firstHash = repository.save.mock.calls[0][0].errorHash

      repository.findOne.mockResolvedValue(null)
      await service.shouldSendAlert('Subject', new Error('autre erreur'))
      const secondHash = repository.save.mock.calls[1][0].errorHash

      expect(firstHash).not.toBe(secondHash)
    })

    it('devrait gérer une erreur non-objet (string) sans planter', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.shouldSendAlert('Subject', 'plain string error')).resolves.toBe(true)
    })
  })

  describe('getErrorOccurrenceCount', () => {
    it("devrait retourner 0 si aucun enregistrement n'existe", async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.getErrorOccurrenceCount('Subject', new Error('boom'))

      expect(result).toBe(0)
    })

    it("devrait retourner le compteur d'occurrences existant", async () => {
      repository.findOne.mockResolvedValue({ occurrenceCount: 5 } as ErrorRecord)

      const result = await service.getErrorOccurrenceCount('Subject', new Error('boom'))

      expect(result).toBe(5)
    })
  })

  describe('resetLastNotificationTimestamp', () => {
    it("ne devrait rien faire si aucun enregistrement n'existe", async () => {
      repository.findOne.mockResolvedValue(null)

      await service.resetLastNotificationTimestamp('Subject', new Error('boom'))

      expect(repository.save).not.toHaveBeenCalled()
    })

    it("devrait réinitialiser lastNotificationSent à l'époque Unix", async () => {
      const record = { lastNotificationSent: new Date() } as ErrorRecord
      repository.findOne.mockResolvedValue(record)

      await service.resetLastNotificationTimestamp('Subject', new Error('boom'))

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ lastNotificationSent: new Date(0) }))
    })
  })

  describe('shouldSendAlertWithoutRecording', () => {
    it('devrait créer un enregistrement non notifié et retourner true pour une nouvelle erreur', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.shouldSendAlertWithoutRecording('Subject', new Error('boom'))

      expect(result).toBe(true)
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ occurrenceCount: 1, lastNotificationSent: new Date(0) })
      )
    })

    it('devrait incrémenter le compteur sans modifier lastNotificationSent', async () => {
      const lastNotificationSent = new Date(Date.now() - 5 * 60 * 1000)
      repository.findOne.mockResolvedValue({
        occurrenceCount: 1,
        lastOccurrence: new Date(0),
        lastNotificationSent,
      } as ErrorRecord)

      const result = await service.shouldSendAlertWithoutRecording('Subject', new Error('boom'), 60)

      expect(result).toBe(false)
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ occurrenceCount: 2, lastNotificationSent })
      )
    })

    it('devrait retourner true si le throttle est écoulé sans marquer comme notifié', async () => {
      const lastNotificationSent = new Date(Date.now() - 120 * 60 * 1000)
      repository.findOne.mockResolvedValue({
        occurrenceCount: 1,
        lastOccurrence: new Date(0),
        lastNotificationSent,
      } as ErrorRecord)

      const result = await service.shouldSendAlertWithoutRecording('Subject', new Error('boom'), 60)

      expect(result).toBe(true)
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ lastNotificationSent }))
    })
  })

  describe('markAlertAsSent', () => {
    it("ne devrait rien faire si aucun enregistrement n'existe", async () => {
      repository.findOne.mockResolvedValue(null)

      await service.markAlertAsSent('Subject', new Error('boom'))

      expect(repository.save).not.toHaveBeenCalled()
    })

    it('devrait mettre à jour lastNotificationSent à maintenant', async () => {
      const record = { lastNotificationSent: new Date(0) } as ErrorRecord
      repository.findOne.mockResolvedValue(record)

      await service.markAlertAsSent('Subject', new Error('boom'))

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ lastNotificationSent: expect.any(Date) }))
      const saved = repository.save.mock.calls[0][0] as ErrorRecord
      expect(saved.lastNotificationSent.getTime()).toBeGreaterThan(0)
    })
  })
})

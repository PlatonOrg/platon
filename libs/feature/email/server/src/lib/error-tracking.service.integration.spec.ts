import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { DataSource, QueryFailedError, Repository } from 'typeorm'
import { ErrorRecord } from './entities/error-record.entity'
import { ErrorTrackingService } from './error-tracking.service'

/**
 * Contrairement à error-tracking.service.spec.ts (repository mocké), ce fichier fait tourner
 * ErrorTrackingService contre un vrai Postgres (Testcontainers) pour exercer l'index unique
 * déclaré sur ErrorRecord.errorHash — un mock de repository ne peut jamais rejeter d'insertion
 * en doublon, alors qu'une vraie contrainte DB le ferait si le service tentait d'insérer deux
 * lignes pour la même erreur au lieu de mettre à jour la ligne existante.
 */
describe('ErrorTrackingService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let errorRecordRepo: Repository<ErrorRecord>
  let service: ErrorTrackingService

  beforeAll(async () => {
    testDb = await createTestDatabase([ErrorRecord])
    dataSource = testDb.dataSource
    errorRecordRepo = dataSource.getRepository(ErrorRecord)
    service = new ErrorTrackingService(errorRecordRepo)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "error_record" CASCADE')
  })

  it('devrait rejeter une insertion directe en doublon sur errorHash (contrainte réelle)', async () => {
    await errorRecordRepo.save({
      errorHash: 'duplicate-hash',
      subject: 'Subject',
      occurrenceCount: 1,
      lastNotificationSent: new Date(),
    })

    await expect(
      errorRecordRepo.insert({
        errorHash: 'duplicate-hash',
        subject: 'Subject',
        occurrenceCount: 1,
        lastNotificationSent: new Date(),
      })
    ).rejects.toBeInstanceOf(QueryFailedError)
  })

  it("ne devrait créer qu'une seule ligne pour des appels répétés de la même erreur (met à jour, ne duplique pas)", async () => {
    const error = new Error('boom')

    await service.shouldSendAlert('Subject', error, 60)
    await service.shouldSendAlert('Subject', error, 60)
    await service.shouldSendAlert('Subject', error, 60)

    const rows = await errorRecordRepo.find()
    expect(rows).toHaveLength(1)
    expect(rows[0].occurrenceCount).toBe(3)
  })

  it('devrait autoriser le throttle complet en base : première alerte true, suivante immédiate false, après expiration true', async () => {
    const error = new Error('throttle-test')

    const first = await service.shouldSendAlert('Subject', error, 1 / 60)
    const second = await service.shouldSendAlert('Subject', error, 60)

    expect(first).toBe(true)
    expect(second).toBe(false)

    const rows = await errorRecordRepo.find()
    expect(rows).toHaveLength(1)
    expect(rows[0].occurrenceCount).toBe(2)
  })
})

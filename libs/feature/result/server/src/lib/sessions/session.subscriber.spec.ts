import { DataSource, EntityManager, InsertEvent } from 'typeorm'
import { SessionDataEntity } from './session-data.entity'
import { SessionEntity } from './session.entity'
import { SessionSubscriber } from './session.subscriber'

describe('SessionSubscriber', () => {
  let subscriber: SessionSubscriber
  let dataSource: { subscribers: unknown[] }
  let manager: { query: jest.Mock; save: jest.Mock }

  beforeEach(() => {
    dataSource = { subscribers: [] }
    manager = { query: jest.fn(), save: jest.fn() }
    subscriber = new SessionSubscriber(dataSource as unknown as DataSource)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("devrait s'enregistrer lui-même auprès du dataSource", () => {
    expect(dataSource.subscribers).toContain(subscriber)
  })

  it('listenTo devrait cibler SessionEntity', () => {
    expect(subscriber.listenTo()).toBe(SessionEntity)
  })

  describe('afterInsert', () => {
    it('ne devrait rien sauvegarder si aucune sessionData correspondante', async () => {
      manager.query.mockResolvedValue([])

      await subscriber.afterInsert({
        entity: { id: 'session-1' } as SessionEntity,
        manager: manager as unknown as EntityManager,
      } as InsertEvent<SessionEntity>)

      expect(manager.save).not.toHaveBeenCalled()
    })

    it('ne devrait rien sauvegarder si la requête retourne null', async () => {
      manager.query.mockResolvedValue(null)

      await subscriber.afterInsert({
        entity: { id: 'session-1' } as SessionEntity,
        manager: manager as unknown as EntityManager,
      } as InsertEvent<SessionEntity>)

      expect(manager.save).not.toHaveBeenCalled()
    })

    it('devrait mapper et sauvegarder la sessionData retrouvée', async () => {
      manager.query.mockResolvedValue([
        {
          id: 'session-1',
          user_id: 'user-1',
          parent_id: null,
          grade: 10,
          attempts: 1,
          resource_id: 'res-1',
          resource_type: 'exercise',
          correction_enabled: false,
        },
      ])

      await subscriber.afterInsert({
        entity: { id: 'session-1' } as SessionEntity,
        manager: manager as unknown as EntityManager,
      } as InsertEvent<SessionEntity>)

      expect(manager.save).toHaveBeenCalledWith(
        SessionDataEntity,
        expect.objectContaining({ id: 'session-1', userId: 'user-1', resourceId: 'res-1' })
      )
    })
  })

  describe('retrieveSessionData', () => {
    it('devrait retourner undefined pour un tableau vide (jointures sans correspondance)', async () => {
      manager.query.mockResolvedValue([])

      const result = await SessionSubscriber.retrieveSessionData('session-1', manager as unknown as EntityManager)

      expect(result).toBeUndefined()
    })
  })
})

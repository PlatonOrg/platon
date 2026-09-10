import { DataSource } from 'typeorm'
import { ResourceStatsSubscriber } from './statistic.subscriber'

describe('ResourceStatsSubscriber', () => {
  let subscriber: ResourceStatsSubscriber
  let dataSource: { subscribers: unknown[]; query: jest.Mock }

  beforeEach(() => {
    dataSource = { subscribers: [], query: jest.fn().mockResolvedValue(undefined) }
    subscriber = new ResourceStatsSubscriber(dataSource as unknown as DataSource)
  })

  it("devrait s'enregistrer lui-même auprès du DataSource", () => {
    expect(dataSource.subscribers).toContain(subscriber)
  })

  describe('afterInsert / afterUpdate / afterRemove', () => {
    const buildEvent = (tableName: string) => ({
      metadata: { tableName },
      manager: { query: jest.fn().mockResolvedValue(undefined) },
    })

    it('devrait rafraîchir la vue matérialisée pour une table surveillée', async () => {
      const event = buildEvent('Resources')

      await subscriber.afterInsert(event as never)

      expect(event.manager.query).toHaveBeenCalledWith('REFRESH MATERIALIZED VIEW "ResourceStats"')
    })

    it('ne devrait rien faire pour une table non surveillée', async () => {
      const event = buildEvent('SomeOtherTable')

      await subscriber.afterUpdate(event as never)

      expect(event.manager.query).not.toHaveBeenCalled()
    })

    it('afterRemove devrait aussi rafraîchir la vue pour une table surveillée', async () => {
      const event = buildEvent('ResourceMembers')

      await subscriber.afterRemove(event as never)

      expect(event.manager.query).toHaveBeenCalled()
    })
  })

  describe('onChangeFile', () => {
    it('devrait mettre à jour la date de la ressource puis rafraîchir la vue', async () => {
      await (subscriber as never as { onChangeFile: (p: unknown) => Promise<void> }).onChangeFile({
        resource: { id: 'resource-1' },
      })

      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "Resources"'), ['resource-1'])
      expect(dataSource.query).toHaveBeenCalledWith('REFRESH MATERIALIZED VIEW "ResourceStats"')
    })

    it('ne devrait pas laisser fuiter une erreur', async () => {
      dataSource.query.mockRejectedValue(new Error('db error'))

      await expect(
        (subscriber as never as { onChangeFile: (p: unknown) => Promise<void> }).onChangeFile({
          resource: { id: 'resource-1' },
        })
      ).resolves.toBeUndefined()
    })
  })
})

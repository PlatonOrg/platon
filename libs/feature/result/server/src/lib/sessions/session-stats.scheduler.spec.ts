import { DataSource } from 'typeorm'
import { SessionStatsScheduler } from './session-stats.scheduler'

describe('SessionStatsScheduler', () => {
  let scheduler: SessionStatsScheduler
  let dataSource: { query: jest.Mock }

  beforeEach(() => {
    dataSource = { query: jest.fn() }
    scheduler = new SessionStatsScheduler(dataSource as unknown as DataSource)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('devrait rafraîchir la vue matérialisée ResourceSessionStats', async () => {
    dataSource.query.mockResolvedValue(undefined)

    await scheduler.refreshSessionStats()

    expect(dataSource.query).toHaveBeenCalledWith(`REFRESH MATERIALIZED VIEW CONCURRENTLY "ResourceSessionStats"`)
  })

  it('ne devrait pas propager une erreur si le rafraîchissement échoue', async () => {
    dataSource.query.mockRejectedValue(new Error('boom'))

    await expect(scheduler.refreshSessionStats()).resolves.toBeUndefined()
  })
})

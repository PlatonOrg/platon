import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { DataSource } from 'typeorm'

@Injectable()
export class SessionStatsScheduler {
  private readonly logger = new Logger(SessionStatsScheduler.name)

  constructor(private readonly dataSource: DataSource) {}

  // Refresh the materialized view every hour at minute 0
  // More info to modify the cron expression: https://docs.nestjs.com/techniques/task-scheduling
  @Cron('0 * * * *')
  async refreshSessionStats(): Promise<void> {
    const t0 = Date.now()
    try {
      await this.dataSource.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY "ResourceSessionStats"`)
      this.logger.log(`ResourceSessionStats refreshed in ${Date.now() - t0}ms`)
    } catch (error) {
      this.logger.error('Failed to refresh ResourceSessionStats', error)
    }
  }
}

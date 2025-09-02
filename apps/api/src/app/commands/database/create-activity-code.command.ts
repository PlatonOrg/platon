import { Injectable, Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { ActivityEntity } from '@platon/feature/course/server'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

@Command({
  name: 'create-activity-code',
  description: 'Create activity code',
})
@Injectable()
export class CreateActivityCodeCommand extends CommandRunner {
  private readonly logger = new Logger(CreateActivityCodeCommand.name)
  constructor(
    @InjectRepository(ActivityEntity)
    private readonly repository: Repository<ActivityEntity>
  ) {
    super()
  }

  public async run(): Promise<void> {
    let good = 0
    let skipped = 0
    let errors = 0
    const activities = await this.repository.find()
    this.logger.log(`Found ${activities.length} activities to sync...`)

    for (const activity of activities) {
      try {
        if (activity.code && activity.code.length > 0) {
          this.logger.log(`Activity ${activity.id} already has a code`)
          skipped++
          continue
        }
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
        this.logger.log(`Created activity code for ${activity.id}: ${code}`)
        activity.code = code
        const updatedActivity = await this.repository.save(activity)
        this.logger.log(`Updated activity ${activity.id} with new code: ${updatedActivity.code}`)
        good++
      } catch (error) {
        this.logger.error(`Failed to create activity code for ${activity.id}: ${error}`)
        errors++
      }
    }
    this.logger.log(`Finished syncing activities`)
    this.logger.log(`Good: ${good}`)
    this.logger.log(`Skipped: ${skipped}`)
    this.logger.log(`Errors: ${errors}`)
  }
}

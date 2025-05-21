import { Module } from '@nestjs/common'
import { SyncResourceMetadatasCommand } from './database/sync-resource-metadata.command'
import { FeatureResourceServerModule } from '@platon/feature/resource/server'
import { SyncActivities } from './database/sync-activities-command'
import { SyncExercisesDependencies } from './database/sync-exercises-dependencies.command'

const commands = [SyncResourceMetadatasCommand, SyncActivities, SyncExercisesDependencies]

@Module({
  imports: [FeatureResourceServerModule],
  providers: [...commands],
  exports: [...commands],
})
export class CommandsModule {}

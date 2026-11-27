import { Module } from '@nestjs/common'
import { SyncResourceMetadatasCommand } from './database/sync-resource-metadata.command'
import { FeatureResourceServerModule } from '@platon/feature/resource/server'
import { SyncActivities } from './database/sync-activities-command'
import { SyncExercisesDependencies } from './database/sync-exercises-dependencies.command'
import { CreateActivityCodeCommand } from './database/create-activity-code.command'
import { FeatureCourseServerModule } from '@platon/feature/course/server'

const commands = [SyncResourceMetadatasCommand, SyncActivities, SyncExercisesDependencies, CreateActivityCodeCommand]

@Module({
  imports: [FeatureResourceServerModule, FeatureCourseServerModule],
  providers: [...commands],
  exports: [...commands],
})
export class CommandsModule {}

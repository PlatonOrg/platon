import { Module } from '@nestjs/common'
import { SyncResourceMetadatasCommand } from './database/sync-resource-metadata.command'
import { FeatureResourceServerModule } from '@platon/feature/resource/server'
import { SyncActivities } from './database/sync-activities-command'
import { SyncExercisesDependencies } from './database/sync-exercises-dependencies.command'
import { FeatureAiServerModule } from '@platon/feature/ai/server'
import { RagDocCommand } from './database/rag-doc.command'

const commands = [SyncResourceMetadatasCommand, SyncActivities, SyncExercisesDependencies, RagDocCommand]

@Module({
  imports: [FeatureResourceServerModule, FeatureAiServerModule],
  providers: [...commands],
  exports: [...commands],
})
export class CommandsModule {}

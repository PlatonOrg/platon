import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BuilderAiController } from './builder-ai/builder-ai.controller'
import { BuilderAiService } from './builder-ai/builder-ai.service'

@Module({
  imports: [HttpModule],
  controllers: [BuilderAiController],
  providers: [BuilderAiService],
  exports: [BuilderAiService],
})
export class FeatureBuilderServerModule {}
import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { AiOrchestrator } from './ai.orchestrator'
import { AiService } from './ai.service'
import { ConfigModule } from '@nestjs/config'
import { RagService } from './RAG/rag.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocumentationEntity } from './RAG/documentation.entity'
import { AiChatEntity } from './chat/ai-chat.entity'
import { AiMessageEntity } from './chat/ai-message.entity'
import { AiChatService } from './chat/ai-chat.service'
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([DocumentationEntity, AiChatEntity, AiMessageEntity])],
  controllers: [AiController],
  providers: [AiService, AiOrchestrator, RagService, AiChatService],
  exports: [RagService],
})
export class FeatureAiServerModule {}

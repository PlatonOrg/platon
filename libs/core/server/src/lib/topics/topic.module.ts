import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TopicController } from './topic.controller'
import { TopicEntity } from './topic.entity'
import { TopicService } from './topic.service'
import { NameSimilarityService } from '../utils'

@Module({
  controllers: [TopicController],
  providers: [TopicService, NameSimilarityService],
  imports: [TypeOrmModule.forFeature([TopicEntity])],
  exports: [TopicService],
})
export class TopicModule {}

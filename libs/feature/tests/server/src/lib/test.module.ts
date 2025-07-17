import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule, UserModule } from '@platon/core/server'
import { FeatureCourseServerModule } from '@platon/feature/course/server'
import { TestsCandidatesController } from './tests-candidates/tests-candidates.controller'
import { TestsCandidatesService } from './tests-candidates/tests-candidates.service'
import { TestsCandidatesEntity } from './tests-candidates/tests-candidates.entity'
import { TestService } from './test.service'
import { TestEntity } from './test.entity'
import { TestController } from './test.controller'
import { FeatureEmailModule } from '@platon/feature/email/server'
import { EditorjsViewerService } from '@platon/shared/utils'

@Module({
  imports: [
    UserModule,
    AuthModule,
    FeatureCourseServerModule,
    FeatureEmailModule,
    TypeOrmModule.forFeature([TestsCandidatesEntity]),
    TypeOrmModule.forFeature([TestEntity]),
  ],
  controllers: [TestsCandidatesController, TestController],
  providers: [TestsCandidatesService, TestService, EditorjsViewerService],
  exports: [TestsCandidatesService, TestService],
})
export class FeatureTestsServerModule {}

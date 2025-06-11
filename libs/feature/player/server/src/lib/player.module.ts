import { DiscoveryModule } from '@golevelup/nestjs-discovery'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { FeatureCourseServerModule } from '@platon/feature/course/server'
import { FeatureResourceServerModule } from '@platon/feature/resource/server'
import { FeatureResultServerModule } from '@platon/feature/result/server'
import { FeaturePeerServerModule } from '@platon/feature/peer/server'
import { PlayerController } from './player.controller'
import { PlayerService } from './player.service'
import { NodeSandbox } from './sandboxes'
import { PythonSandbox } from './sandboxes/python/python-sandbox'
import { SandboxService } from './sandboxes/sandbox.service'
import { FeatureEmailModule } from '@platon/feature/email/server'

@Module({
  controllers: [PlayerController],
  imports: [
    HttpModule,
    DiscoveryModule,
    FeatureCourseServerModule,
    FeatureResultServerModule,
    FeatureResourceServerModule,
    FeaturePeerServerModule,
    FeatureEmailModule,
  ],
  providers: [PlayerService, NodeSandbox, PythonSandbox, SandboxService],
  exports: [PlayerService, SandboxService],
})
export class FeaturePlayerServerModule {}

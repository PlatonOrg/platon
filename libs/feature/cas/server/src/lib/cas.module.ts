import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { CasController } from './cas.controller'
import { CasService } from './cas.service'
import { AuthModule, UserModule } from '@platon/core/server'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CasEntity } from './entities/cas.entity'
import { FeatureLtiServerModule } from '@platon/feature/lti/server'

@Module({
  imports: [HttpModule, UserModule, AuthModule, FeatureLtiServerModule, TypeOrmModule.forFeature([CasEntity])],
  controllers: [CasController],
  providers: [CasService],
  exports: [CasService],
})
export class FeatureCasServerModule {}

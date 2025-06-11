
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailService } from './email.service'
import { ErrorTrackingService } from './error-tracking.service'
import { ErrorRecord } from './entities/error-record.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ErrorRecord])],
  providers: [EmailService, ErrorTrackingService],
  exports: [EmailService],
})
export class FeatureEmailModule {}

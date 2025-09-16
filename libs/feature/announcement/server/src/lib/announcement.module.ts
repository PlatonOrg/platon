import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AnnouncementEntity } from './announcement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnnouncementEntity]),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [TypeOrmModule, AnnouncementService],
})
export class FeatureAnnouncementServerModule {}

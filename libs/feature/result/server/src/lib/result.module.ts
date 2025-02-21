import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ActivityService, FeatureCourseServerModule } from '@platon/feature/course/server'
import { FeatureResourceServerModule } from '@platon/feature/resource/server'
import { AnswerEntity } from './answers/answer.entity'
import { AnswerService } from './answers/answer.service'
import { SessionCommentController } from './comments/comment.controller'
import { SessionCommentEntity } from './comments/comment.entity'
import { SessionCommentService } from './comments/comment.service'
import { CorrectionController } from './correction/correction.controller'
import { CorrectionEntity } from './correction/correction.entity'
import { CorrectionService } from './correction/correction.service'
import { DashboardController } from './dashboard/dashboard.controller'
import { DashboardService } from './dashboard/dashboard.service'
import { CourseExpander } from './expanders/course.expander'
import { ResourceExpander } from './expanders/resource.expander'
import { LeaderboardController } from './leaderboard/leaderboard.controller'
import { LeaderboardService } from './leaderboard/leaderboard.service'
import { LeaderboardView } from './leaderboard/leaderboard.view'
import { ActivityResultsVirtualColumnsResolver } from './resolvers/activity-results-virtual-columns.resolver'
import { ResultController } from './result.controller'
import { SessionEntity } from './sessions/session.entity'
import { SessionService } from './sessions/session.service'
import { SessionDataEntity } from './sessions/session-data.entity'
import { SessionSubscriber } from './sessions/session.subscriber'
import { LabelService } from './label/label.service'
import { LabelController } from './label/label.controller'
import { LabelEntity } from './label/label.entity'
import { CorrectionLabelEntity } from './correction/correction-label/correction-label.entity'
import { CorrectionLabelService } from './correction/correction-label/correction-label.service'
@Module({
  imports: [
    FeatureCourseServerModule,
    FeatureResourceServerModule,
    TypeOrmModule.forFeature([
      LeaderboardView,
      SessionEntity,
      AnswerEntity,
      CorrectionEntity,
      SessionCommentEntity,
      SessionDataEntity,
      SessionSubscriber,
      LabelEntity,
      CorrectionLabelEntity,
    ]),
  ],
  controllers: [
    ResultController,
    DashboardController,
    CorrectionController,
    LeaderboardController,
    SessionCommentController,
    LabelController,
  ],
  providers: [
    AnswerService,
    SessionService,
    SessionSubscriber,
    DashboardService,
    CorrectionService,
    LeaderboardService,
    SessionCommentService,
    ActivityResultsVirtualColumnsResolver,
    CourseExpander,
    ResourceExpander,
    ActivityService,
    LabelService,
    CorrectionLabelService,
  ],
  exports: [
    TypeOrmModule,
    AnswerService,
    SessionService,
    SessionSubscriber,
    CorrectionService,
    SessionCommentService,
    LeaderboardService,
    ActivityService,
    LabelService,
    CorrectionLabelService,
  ],
})
export class FeatureResultServerModule {}

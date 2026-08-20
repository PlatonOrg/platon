import { ExpandContext, Expander } from '@cisstech/nestjs-expand'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { isTeacherRole } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { ActivityKind, CourseStatistic } from '@platon/feature/course/common'
import {
  ActivityEntity,
  ActivityMemberView,
  CourseDTO,
  CourseMemberService,
  LessonProgressService,
} from '@platon/feature/course/server'
import { PlayerActivityVariables } from '@platon/feature/player/common'
import differenceInSeconds from 'date-fns/differenceInSeconds'
import { IsNull, Repository } from 'typeorm'
import { SessionEntity } from '../sessions/session.entity'

@Injectable()
@Expander(CourseDTO)
export class CourseExpander {
  constructor(
    private readonly courseMemberService: CourseMemberService,
    private readonly lessonProgressService: LessonProgressService,
    @InjectRepository(ActivityEntity)
    private readonly activityRepository: Repository<ActivityEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>
  ) {}

  async statistic(context: ExpandContext<IRequest, CourseDTO>): Promise<CourseStatistic> {
    const { parent, request } = context
    const { user } = request
    const [members, sessions, activities] = await Promise.all([
      this.courseMemberService.findViewsByCourseIds([parent.id]),
      this.sessionRepository.find({
        where: {
          parentId: IsNull(),
          activity: { courseId: parent.id },
          userId: user.id,
        },
        relations: { activity: true },
      }),
      this.activityRepository
        .createQueryBuilder('activity')
        .leftJoin(ActivityMemberView, 'member', 'member.activity_id = activity.id AND member.id = :userId', {
          userId: user.id,
        })
        .select(['activity.id', 'activity.courseId', 'activity.isChallenge', 'activity.kind'])
        .where('activity.course_id = :courseId', { courseId: parent.id })
        .andWhere(`(activity.creator_id = :userId OR member.id IS NOT NULL)`, { userId: user.id })
        .getMany(),
    ])

    let timeSpent = 0
    let progressionSum = 0

    sessions.forEach((session: SessionEntity<PlayerActivityVariables>) => {
      const { lastGradedAt, startedAt } = session
      if (lastGradedAt && startedAt) {
        timeSpent += differenceInSeconds(lastGradedAt, startedAt)
      }

      const { navigation } = session.variables
      if (navigation?.exercises) {
        const { exercises } = navigation
        const graded = exercises.filter((e) => !['NOT_STARTED', 'STARTED'].includes(e.state)).length
        const started = exercises.filter((e) => e.state !== 'NOT_STARTED').length
        progressionSum += (100 * graded + 10 * (started - graded)) / exercises.length
      }
    })

    // Les leçons (cours OpenClass) ne produisent pas de session : leur progression
    // (0 ou 100) est ajoutée séparément pour ne pas fausser la moyenne globale, dont
    // le dénominateur (`activities.length`) compte déjà exercices et leçons ensemble.
    const lessonActivities = activities.filter((activity) => activity.kind === ActivityKind.LESSON)
    if (lessonActivities.length) {
      const completedLessonIds = await this.lessonProgressService.findCompletedActivityIds(
        lessonActivities.map((activity) => activity.id),
        user.id
      )
      progressionSum += completedLessonIds.size * 100
    }

    return {
      studentCount: members.filter((member) => member.role === 'student').length,
      teacherCount: members.filter((member) => member.role === 'teacher').length,
      progression: Math.round(progressionSum ? progressionSum / activities.length : 0),
      activityCount: activities.length,
      challengeCount: activities.filter((activity) => activity.isChallenge).length,
      timeSpent,
    }
  }
}

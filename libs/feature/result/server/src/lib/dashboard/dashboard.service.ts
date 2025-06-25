import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BadRequestResponse, NotFoundResponse, UserRoles, isTeacherRole } from '@platon/core/common'
import { UserEntity } from '@platon/core/server'
import { ActivityEntity, ActivityMemberView, CourseMemberView } from '@platon/feature/course/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { ResourceEntity, ResourceService } from '@platon/feature/resource/server'
import {
  ACTIVITY_COURSE_USED_IN_COUNT,
  ACTIVITY_COURSE_USED_IN_LIST,
  DashboardOutput,
  USER_ACTIVITY_COUNT,
  USER_COURSE_COUNT,
  UserActivityResultsDistribution,
} from '@platon/feature/result/common'
import { In, IsNull, Not, Raw, Repository } from 'typeorm'
import { SessionDataEntity } from '../sessions/session-data.entity'
import {
  ActivityAnswerRate,
  ActivityDistribution,
  ActivityDropoutRate,
  ActivityExerciseResults,
  ActivityTotalAttempts,
  ActivityTotalCompletions,
  ActivityUserResults,
} from './aggregators/activity.aggregator'
import {
  ExerciceAverageTimeToAttempt,
  ExerciseAnswerRate,
  ExerciseAverageAttempts,
  ExerciseAverageAttemptsToSuccess,
  ExerciseDropOutRate,
  ExerciseSuccessRateOnFirstAttempt,
  ExerciseTotalAttempts,
} from './aggregators/exercise.aggregator'
import {
  SessionAverageDuration,
  SessionAverageScore,
  SessionAverageScoreByMonth,
  SessionDistributionByAnswerState,
  SessionSuccessRate,
  SessionTotalDuration,
  SessionTotalDurationByMonth,
} from './aggregators/session.aggregator'
import { UserExerciseCount } from './aggregators/user.aggregator'
import { extractExercisesFromActivityVariables } from '@platon/feature/compiler'

@Injectable()
export class DashboardService {
  constructor(
    private readonly resourceService: ResourceService,

    @InjectRepository(SessionDataEntity)
    private readonly sessionData: Repository<SessionDataEntity>,
    @InjectRepository(CourseMemberView)
    private readonly courseMemberView: Repository<CourseMemberView>,
    @InjectRepository(ActivityEntity)
    private readonly activityRepository: Repository<ActivityEntity>,
    @InjectRepository(ActivityMemberView)
    private readonly activityMemberView: Repository<ActivityMemberView>
  ) {}

  async ofUser(user: UserEntity): Promise<DashboardOutput> {
    const output: DashboardOutput = {}

    const [courseMembers, activityMembers] = await Promise.all([
      this.courseMemberView.find({
        where: { id: user.id },
      }),
      this.activityMemberView.find({
        where: { id: user.id },
        select: { activityId: true },
      }),
    ])

    const [sessions] = await Promise.all([
      this.sessionData.find({
        where: [
          {
            userId: user.id,
            parentId: Not(IsNull()),
            activityId: Not(IsNull()),
          },
          ...(isTeacherRole(user.role) && activityMembers.length
            ? [
                {
                  activityId: In(activityMembers.map((member) => member.activityId)),
                  parentId: Not(IsNull()),
                  userId: Not(user.id),
                },
              ]
            : []),
        ],
      }),
    ])

    const userSessions = sessions.filter((session) => session.userId === user.id)
    const studentSessions = sessions.filter((session) => session.userId !== user.id) // will also include teachers

    const userSessionAggregators = [
      new SessionTotalDuration(),
      new SessionSuccessRate(),
      new SessionAverageScore(),
      new SessionAverageDuration(),
      new SessionAverageScoreByMonth(),
      new SessionTotalDurationByMonth(),
      new SessionDistributionByAnswerState(),

      new ExerciseAnswerRate(),
      new ExerciseDropOutRate(),
      new ExerciseSuccessRateOnFirstAttempt(),
      new ExerciseAverageAttemptsToSuccess(),

      new UserExerciseCount(),
    ]

    userSessions.forEach((session) => {
      userSessionAggregators.forEach((aggregator) => aggregator.next(session))
    })

    const userOutput: DashboardOutput = {}
    userSessionAggregators.forEach((aggregator) => {
      userOutput[aggregator.id] = aggregator.complete()
    })

    userOutput[USER_COURSE_COUNT] = courseMembers.length
    userOutput[USER_ACTIVITY_COUNT] = activityMembers.length

    output['user'] = userOutput

    if (isTeacherRole(user.role)) {
      const studentSessionAggregators = [
        new SessionTotalDuration(),
        new SessionSuccessRate(),
        new SessionAverageScore(),
        new SessionAverageDuration(),
        new SessionAverageScoreByMonth(),
        new SessionTotalDurationByMonth(),
        new SessionDistributionByAnswerState(),

        new ExerciseAnswerRate(),
        new ExerciseDropOutRate(),
        new ExerciseSuccessRateOnFirstAttempt(),
        new ExerciseAverageAttemptsToSuccess(),
      ]

      studentSessions.forEach((session) => {
        studentSessionAggregators.forEach((aggregator) => aggregator.next(session))
      })

      const studentOutput: DashboardOutput = {}
      studentSessionAggregators.forEach((aggregator) => {
        studentOutput[aggregator.id] = aggregator.complete()
      })
      output[UserRoles.student] = studentOutput
    }

    return output
  }

  async ofSession(sessionId: string): Promise<[SessionDataEntity, DashboardOutput]> {
    const output: DashboardOutput = {}

    const activitySession = await this.sessionData.findOne({
      where: { id: sessionId },
    })

    if (!activitySession) {
      throw new NotFoundResponse(`Session: ${sessionId}`)
    }

    if (activitySession.parentId) {
      throw new BadRequestResponse(`Session: ${sessionId} is not an activity session`)
    }

    const [activity, exerciseSessions] = await Promise.all([
      activitySession.activityId
        ? this.activityRepository.findOne({
            where: { id: activitySession.activityId },
          })
        : undefined,
      this.sessionData.find({
        where: { parentId: sessionId },
        relations: { user: true },
      }),
    ])

    const aggregators = [
      new ActivityUserResults({
        activity,
        exerciseSessions,
      }),
    ]

    aggregators.forEach((aggregator) => aggregator.next(activitySession))
    aggregators.forEach((aggregator) => {
      output[aggregator.id] = aggregator.complete()
    })

    return [activitySession, output]
  }

  async ofResource(id: string): Promise<DashboardOutput> {
    const resource = (await this.resourceService.findByIdOrCode(id)).orElseThrow(
      () => new NotFoundResponse('Resource not found')
    )

    const output: DashboardOutput = {}

    if (resource.type === ResourceTypes.EXERCISE) {
      await this.ofExerciseResource(resource, output)
    }

    if (resource.type === ResourceTypes.ACTIVITY) {
      await this.ofActivityResource(resource, output)
    }

    return output
  }

  async ofActivity(activityId: string): Promise<DashboardOutput> {
    const output: DashboardOutput = {}
    const resourceMap = new Map<string, string>()
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    })

    if (activity) {
      const resourceIds = extractExercisesFromActivityVariables(activity.source.variables).map((e) => e.resource)
      await Promise.all(
        resourceIds.map(async (resourceId) => {
          const resource = await this.resourceService.findByIdOrCode(resourceId)
          resourceMap.set(resourceId, resource.map((r) => r.name).orElse('unknown'))
        })
      )
    }

    if (!activity) {
      throw new NotFoundResponse(`Activity: ${activityId}`)
    }
    const [sessions, activityMembers] = await Promise.all([
      this.sessionData.find({
        where: { activityId, userId: Not(IsNull()) },
        relations: { user: true },
      }),

      this.activityMemberView.find({
        where: { courseId: activity.courseId, activityId: activity.id },
      }),
    ])

    const activitySessions = sessions.filter((session) => !session.parentId)
    const exerciseSessions = sessions.filter((session) => !!session.parentId)

    // Extract and aggregate session variables statistics from session data
    const sessionVariablesStats = new Map<string, number>()
    const query = `select s.variables->'stats' as stats from "SessionData" sd left join "Sessions" s on s.id = sd.id where s.id = $1`

    for (const session of exerciseSessions) {
      // Process sessions that need stats extraction
      if (session.resourceName.toLowerCase().includes('sondage')) {
        const stats = await this.sessionData.query(query, [session.id])
        stats.forEach((stat: { stats: Record<string, number> | string }) => {
          // Handle both object and string JSON formats
          const statsObj = typeof stat.stats === 'string' ? JSON.parse(stat.stats) : stat.stats
          if (statsObj) {
            Object.entries(statsObj).forEach(([key, value]) => {
              if (typeof value === 'number') {
                sessionVariablesStats.set(key, (sessionVariablesStats.get(key) ?? 0) + value)
              }
            })
          }
        })
      }
    }

    const aggregators = [
      new SessionSuccessRate(),
      new SessionAverageScore(),
      new SessionTotalDuration(),
      new SessionAverageDuration(),

      new SessionDistributionByAnswerState(),

      new ActivityAnswerRate(),
      new ActivityDropoutRate(),
      new ActivityTotalAttempts(),
      new ActivityTotalCompletions(),

      new ActivityUserResults({
        activity,
        activityMembers,
        exerciseSessions,
        resourceMap,
      }),

      new ActivityExerciseResults(
        {
          activity,
          exerciseSessions,
        },
        sessionVariablesStats
      ),
    ]

    activitySessions.forEach((session) => aggregators.forEach((aggregator) => aggregator.next(session)))
    aggregators.forEach((aggregator) => {
      output[aggregator.id] = aggregator.complete()
    })

    return output
  }

  private async ofExerciseResource(resource: ResourceEntity, output: DashboardOutput): Promise<void> {
    const sessions = await this.sessionData.find({
      where: {
        resourceId: resource.id,
        userId: Not(IsNull()),
      },
    })

    const aggregators = [
      new SessionSuccessRate(),
      new SessionAverageScore(),
      new SessionAverageDuration(),
      new SessionTotalDuration(),
      new SessionDistributionByAnswerState(),
      new SessionAverageScoreByMonth(),
      new SessionTotalDurationByMonth(),

      new ExerciseAnswerRate(),
      new ExerciseDropOutRate(),
      new ExerciseTotalAttempts(),
      new ExerciseAverageAttempts(),
      new ExerciceAverageTimeToAttempt(),
      new ExerciseSuccessRateOnFirstAttempt(),
      new ExerciseAverageAttemptsToSuccess(),
    ]

    sessions.forEach((session) => aggregators.forEach((aggregator) => aggregator.next(session)))
    aggregators.forEach((aggregator) => {
      output[aggregator.id] = aggregator.complete()
    })
  }

  private async ofActivityResource(resource: ResourceEntity, output: DashboardOutput): Promise<void> {
    const activitySessions = await this.sessionData.find({
      where: {
        resourceId: resource.id,
        userId: Not(IsNull()),
      },
    })

    const [exerciseSessions, usedInActivities] = await Promise.all([
      this.sessionData.find({
        where: {
          parentId: In(activitySessions.map((s) => s.id)),
          userId: Not(IsNull()),
        },
      }),
      this.activityRepository.find({
        where: {
          source: Raw((alias) => `${alias} @> '${JSON.stringify({ resource: resource.id })}'`),
        },
        select: { courseId: true },
      }),
    ])

    const aggregators = [
      new SessionSuccessRate(),
      new SessionAverageScore(),
      new SessionTotalDuration(),
      new SessionAverageDuration(),

      new SessionAverageScoreByMonth(),
      new SessionTotalDurationByMonth(),

      new SessionDistributionByAnswerState(),

      new ActivityAnswerRate(),
      new ActivityDropoutRate(),
      new ActivityTotalAttempts(),
      new ActivityTotalCompletions(),

      new ActivityExerciseResults({ exerciseSessions }, new Map<string, number>()),
    ]

    activitySessions.forEach((session) => aggregators.forEach((aggregator) => aggregator.next(session)))
    aggregators.forEach((aggregator) => {
      output[aggregator.id] = aggregator.complete()
    })

    const usedInCourses = Array.from(new Set(usedInActivities.map((a) => a.courseId)))

    output[ACTIVITY_COURSE_USED_IN_LIST] = usedInCourses.slice(0, 5)
    output[ACTIVITY_COURSE_USED_IN_COUNT] = usedInCourses.length
  }

  async ofActivityForDate(
    activityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserActivityResultsDistribution[]> {
    let output: UserActivityResultsDistribution[] = []

    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    })

    if (!activity) {
      throw new NotFoundResponse(`Activity: ${activityId}`)
    }

    const [sessions, activityMembers] = await Promise.all([
      this.sessionData
        .createQueryBuilder('sd')
        .innerJoinAndSelect('sd.user', 'u') // Inner join avec Users
        .where('sd.activityId = :activityId', { activityId: activity.id })
        .andWhere('sd.userId IS NOT NULL')
        .andWhere(
          `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(sd.answers) AS answer_obj
          WHERE (answer_obj->>'createdAt')::timestamp BETWEEN :startDate AND :endDate
        )`
        )
        .setParameters({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .getMany(),
      this.activityMemberView.find({
        where: { courseId: activity.courseId, activityId: activity.id },
      }),
    ])

    const exerciseSessions = sessions

    const aggregators = [
      new ActivityDistribution({
        activityMembers,
        exerciseSessions,
      }),
    ]

    exerciseSessions.forEach((session) => aggregators.forEach((aggregator) => aggregator.next(session)))
    aggregators.forEach((aggregator) => {
      output = aggregator.complete()
    })

    return output
  }
}

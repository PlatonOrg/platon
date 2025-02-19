import { Injectable } from '@angular/core'
import { ListResponse } from '@platon/core/common'
import {
  ACTIVITY_ANSWER_RATE,
  ACTIVITY_COURSE_USED_IN_COUNT,
  ACTIVITY_COURSE_USED_IN_LIST,
  ACTIVITY_DROP_OUT_RATE,
  ACTIVITY_EXERCISE_RESULTS,
  ACTIVITY_TOTAL_ATTEMPTS,
  ACTIVITY_TOTAL_COMPLETIONS,
  ActivityCorrection,
  ActivityLeaderboardEntry,
  ActivityResults,
  AnswerStates,
  Correction,
  CourseLeaderboardEntry,
  CreateSessionComment,
  DashboardOutput,
  EXERCISE_ANSWER_RATE,
  EXERCISE_AVERAGE_ATTEMPTS,
  EXERCISE_AVERAGE_ATTEMPTS_TO_SUCCESS,
  EXERCISE_AVERAGTE_TIME_TO_ATTEMPT,
  EXERCISE_DROP_OUT_RATE,
  EXERCISE_SUCCESS_RATE_ON_FIRST_ATTEMPT,
  EXERCISE_TOTAL_ATTEMPTS,
  ExerciseResults,
  FindActivityLeaderboard,
  FindCourseLeaderboard,
  SESSION_AVERAGE_DURATION,
  SESSION_AVERAGE_SCORE,
  SESSION_AVERAGE_SCORE_BY_MONTH,
  SESSION_DISTRIBUTION_BY_ANSWER_STATE,
  SESSION_SUCCESS_RATE,
  SESSION_TOTAL_DURATION,
  SESSION_TOTAL_DURATION_BY_MONTH,
  SessionComment,
  USER_ACTIVITY_COUNT,
  USER_COURSE_COUNT,
  USER_EXERCISE_COUNT,
  UpsertCorrection,
  UserActivityResultsDistribution,
  UserResults,
} from '@platon/feature/result/common'
import { Observable, map } from 'rxjs'
import { ResourceDashboardModel, UserDashboardModel } from '../models/dashboard.model'
import { ResultProvider } from '../models/result-provider'
import { SessionCommentProvider } from '../models/session-comment-provider'

@Injectable({ providedIn: 'root' })
export class ResultService {
  constructor(
    private readonly resultProvider: ResultProvider,
    private readonly commentProvider: SessionCommentProvider
  ) {}

  userDashboard() {
    return this.resultProvider.userDashboard().pipe(
      map((output) => {
        const user = output['user'] as DashboardOutput
        const model: UserDashboardModel = {
          user: {
            successRate: user[SESSION_SUCCESS_RATE] as number,
            averageScore: user[SESSION_AVERAGE_SCORE] as number,
            totalDuration: user[SESSION_TOTAL_DURATION] as number,
            dropoutRate: user[EXERCISE_DROP_OUT_RATE] as number,
            answerRate: user[EXERCISE_ANSWER_RATE] as number,
            courseCount: user[USER_COURSE_COUNT] as number,
            activityCount: user[USER_ACTIVITY_COUNT] as number,
            exerciseCount: user[USER_EXERCISE_COUNT] as number,
            scoreDistribution: user[SESSION_AVERAGE_SCORE_BY_MONTH] as Record<string, number>,
            answerDistribution: user[SESSION_DISTRIBUTION_BY_ANSWER_STATE] as Record<AnswerStates, number>,
            durationDistribution: user[SESSION_TOTAL_DURATION_BY_MONTH] as Record<string, number>,
          },
        }
        return model
      })
    )
  }

  resourceDashboard(resourceId: string) {
    return this.resultProvider.resourceDashboard(resourceId).pipe(
      map((output) => {
        const model: ResourceDashboardModel = {
          session: {
            successRate: output[SESSION_SUCCESS_RATE] as number,
            averageScore: output[SESSION_AVERAGE_SCORE] as number,
            totalDuration: output[SESSION_TOTAL_DURATION] as number,
            averageDuration: output[SESSION_AVERAGE_DURATION] as number,
            scoreDistribution: output[SESSION_AVERAGE_SCORE_BY_MONTH] as Record<string, number>,
            answerDistribution: output[SESSION_DISTRIBUTION_BY_ANSWER_STATE] as Record<AnswerStates, number>,
            durationDistribution: output[SESSION_TOTAL_DURATION_BY_MONTH] as Record<string, number>,
          },
          exercise:
            EXERCISE_ANSWER_RATE in output
              ? {
                  answerRate: output[EXERCISE_ANSWER_RATE] as number,
                  dropoutRate: output[EXERCISE_DROP_OUT_RATE] as number,
                  totalAttempts: output[EXERCISE_TOTAL_ATTEMPTS] as number,
                  averageAttempts: output[EXERCISE_AVERAGE_ATTEMPTS] as number,
                  averageTimeToAttempt: output[EXERCISE_AVERAGTE_TIME_TO_ATTEMPT] as number,
                  averageAttemptsToSuccess: output[EXERCISE_AVERAGE_ATTEMPTS_TO_SUCCESS] as number,
                  successRateOnFirstAttempt: output[EXERCISE_SUCCESS_RATE_ON_FIRST_ATTEMPT] as number,
                }
              : undefined,
          activity:
            ACTIVITY_EXERCISE_RESULTS in output
              ? {
                  answerRate: output[ACTIVITY_ANSWER_RATE] as number,
                  dropoutRate: output[ACTIVITY_DROP_OUT_RATE] as number,
                  totalAttempts: output[ACTIVITY_TOTAL_ATTEMPTS] as number,
                  usedInCourses: (output[ACTIVITY_COURSE_USED_IN_LIST] || []) as string[],
                  exerciseResults: output[ACTIVITY_EXERCISE_RESULTS] as ExerciseResults[],
                  totalCompletions: output[ACTIVITY_TOTAL_COMPLETIONS] as number,
                  usedInCoursesCount: (output[ACTIVITY_COURSE_USED_IN_COUNT] || 0) as number,
                }
              : undefined,
        }
        return model
      })
    )
  }

  sessionResults(sessionId: string): Observable<UserResults> {
    return this.resultProvider.sessionResults(sessionId)
  }

  activityResults(activityId: string): Observable<ActivityResults> {
    return this.resultProvider.activityResults(activityId)
  }

  activityResultsForDate(
    activityId: string,
    startDate: Date,
    endDate: Date
  ): Observable<UserActivityResultsDistribution[]> {
    return this.resultProvider.activityResultsForDate(activityId, startDate.getTime(), endDate.getTime())
  }

  courseLeaderboard(input: FindCourseLeaderboard): Observable<CourseLeaderboardEntry[]> {
    return this.resultProvider.courseLeaderboard(input)
  }

  activityLeaderboard(input: FindActivityLeaderboard): Observable<ActivityLeaderboardEntry[]> {
    return this.resultProvider.activityLeaderboard(input)
  }

  findCorrection(activityId: string): Observable<ActivityCorrection> {
    return this.resultProvider.findCorrection(activityId)
  }

  listPendingCorrections(): Observable<ListResponse<ActivityCorrection>> {
    return this.resultProvider.listCorrections().pipe(
      map((response) => {
        response.resources = response.resources.filter((correction) => {
          return correction.exercises.some((exercise) => exercise.correctedAt == null)
        })
        response.total = response.resources.length
        return response
      })
    )
  }

  listAvailableCorrections(): Observable<ListResponse<ActivityCorrection>> {
    return this.resultProvider.listCorrections().pipe(
      map((response) => {
        response.resources = response.resources.filter((correction) => {
          return correction.exercises.every((exercise) => exercise.correctedAt !== null)
        })
        response.total = response.resources.length
        return response
      })
    )
  }

  upsertCorrection(sessionId: string, input: UpsertCorrection): Observable<Correction> {
    return this.resultProvider.upsertCorrection(sessionId, input)
  }

  listComments(sessionId: string, answerId: string): Observable<ListResponse<SessionComment>> {
    return this.commentProvider.list(sessionId, answerId)
  }

  createComment(sessionId: string, answerId: string, input: CreateSessionComment): Observable<SessionComment> {
    return this.commentProvider.create(sessionId, answerId, input)
  }

  deleteComment(comment: SessionComment): Observable<void> {
    return this.commentProvider.delete(comment)
  }
}

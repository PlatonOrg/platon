import {
  EXERCISE_ANSWER_RATE,
  EXERCISE_AVERAGE_ATTEMPTS,
  EXERCISE_AVERAGE_ATTEMPTS_TO_SUCCESS,
  EXERCISE_AVERAGTE_TIME_TO_ATTEMPT,
  EXERCISE_DROP_OUT_RATE,
  EXERCISE_SUCCESS_RATE_ON_FIRST_ATTEMPT,
  EXERCISE_TOTAL_ATTEMPTS,
  EXERCISE_UNIQUE_ATTEMPTS,
} from '@platon/feature/result/common'
import differenceInSeconds from 'date-fns/differenceInSeconds'
import { SessionDataEntity } from '../../sessions/session-data.entity'
import { SessionDataAggregator } from './aggregators'

/**
 * Calculates the exercise answer rate based on session data.
 *
 * - The answer rate is the percentage of sessions that have at least one attempt.
 */
export class ExerciseAnswerRate implements SessionDataAggregator<number> {
  readonly id = EXERCISE_ANSWER_RATE

  private totalSessions = 0
  private totalAttempts = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    if (input.startedAt) {
      this.totalSessions++
      if (input.attempts) {
        this.totalAttempts++
      }
    }
  }

  complete(): number {
    return this.totalSessions > 0 ? Math.round((this.totalAttempts / this.totalSessions) * 100) : 0
  }
}

/**
 * Represents an aggregator for calculating the exercise drop-out rate.
 *
 * - The drop-out rate is the percentage of sessions that have been started but not graded at least once.
 */
export class ExerciseDropOutRate implements SessionDataAggregator<number> {
  readonly id = EXERCISE_DROP_OUT_RATE

  private totalSessions = 0
  private totalDropOuts = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    if (input.startedAt) {
      this.totalSessions++
      if (!input.lastGradedAt) {
        this.totalDropOuts++
      }
    }
  }

  complete(): number {
    return this.totalSessions > 0 ? Math.round((this.totalDropOuts / this.totalSessions) * 100) : 0
  }
}

/**
 * Total number of unique attempts for an exercise.
 */
export class ExerciseTotalAttempts implements SessionDataAggregator<number> {
  readonly id = EXERCISE_TOTAL_ATTEMPTS

  private totalAttempts = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    this.totalAttempts += input.attempts ?? 0
  }

  complete(): number {
    return this.totalAttempts
  }
}

/**
 * Total number of unique attempts for an exercise.
 */
export class ExerciseUniqueAttempts implements SessionDataAggregator<number> {
  readonly id = EXERCISE_UNIQUE_ATTEMPTS

  private totalUniqueAttempts = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    this.totalUniqueAttempts += input.attempts ? 1 : 0
  }

  complete(): number {
    return this.totalUniqueAttempts
  }
}

/**
 * Calculates the average number of attempts per exercise session.
 */
export class ExerciseAverageAttempts implements SessionDataAggregator<number> {
  readonly id = EXERCISE_AVERAGE_ATTEMPTS

  private totalSessions = 0
  private totalAttempts = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    if (input.attempts) {
      this.totalSessions++
      this.totalAttempts += input.attempts
    }
  }

  complete(): number {
    return this.totalSessions > 0 ? this.totalAttempts / this.totalSessions : 0
  }
}

/**
 * Average time it takes to attempt an exercise for the first time in seconds.
 */
export class ExerciceAverageTimeToAttempt implements SessionDataAggregator<number> {
  readonly id = EXERCISE_AVERAGTE_TIME_TO_ATTEMPT

  private totalFirstAttemptTimes: number[] = []

  private getPercentile(arr: number[], percentile: number): number {
    const index = Math.floor(percentile * arr.length)
    return arr[index]
  }

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    if (input.startedAt && input.answers) {
      this.totalFirstAttemptTimes.push(differenceInSeconds(new Date(input.answers[0].createdAt), input.startedAt))
    }
  }

  complete(): number {
    this.totalFirstAttemptTimes.sort((a, b) => a - b)
    const q1 = this.getPercentile(this.totalFirstAttemptTimes, 0.25)
    const q3 = this.getPercentile(this.totalFirstAttemptTimes, 0.75)
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    const filtered = this.totalFirstAttemptTimes.filter((x) => x >= lowerBound && x <= upperBound)
    return filtered.reduce((a, b) => a + b, 0) / filtered.length
  }
}

/**
 * Calculates the average number of attempts to success for exercises in a session.
 *
 * - The average number of attempts to success is the average number of attempts before the first success.
 * - If the session is corrected, the number of attempts to success is always 1.
 */
export class ExerciseAverageAttemptsToSuccess implements SessionDataAggregator<number> {
  readonly id = EXERCISE_AVERAGE_ATTEMPTS_TO_SUCCESS

  private totalSessions = 0
  private totalAttemptsToSuccess = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    if (!input.attempts || !input.answers?.length) return

    this.totalSessions++
    this.totalAttemptsToSuccess +=
      input.correctionGrade === 100 ? 1 : input.answers.findIndex((answer) => answer.grade === 100) + 1
  }

  complete(): number {
    return this.totalSessions > 0 ? this.totalAttemptsToSuccess / this.totalSessions : 0
  }
}

/**
 * Calculates the success rate of exercise sessions on the first attempt.
 *
 * - The success rate on the first attempt is the percentage of sessions that have been graded with a grade of 100 on the first attempt.
 */
export class ExerciseSuccessRateOnFirstAttempt implements SessionDataAggregator<number> {
  readonly id = EXERCISE_SUCCESS_RATE_ON_FIRST_ATTEMPT

  private totalSessions = 0
  private totalSuccessOnFirstAttempt = 0

  next(input: SessionDataEntity): void {
    if (!input.parentId) return
    if (!input.attempts || !input.answers?.length) return

    const firstGrade = input.correctionGrade ?? input.answers.find((answer) => answer.grade >= 0)?.grade ?? -1

    this.totalSessions++
    this.totalSuccessOnFirstAttempt += firstGrade === 100 ? 1 : 0
  }

  complete(): number {
    return this.totalSessions > 0 ? Math.round((this.totalSuccessOnFirstAttempt / this.totalSessions) * 100) : 0
  }
}

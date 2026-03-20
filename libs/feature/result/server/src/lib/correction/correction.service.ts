/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { EventService } from '@platon/core/server'
import { ON_CORRECT_ACTIVITY_EVENT, OnCorrectActivityEventPayload } from '@platon/feature/course/server'
import { ActivityCorrection, ExerciseCorrection } from '@platon/feature/result/common'
import { Repository } from 'typeorm'
import { SessionEntity } from '../sessions/session.entity'
import { CorrectionEntity } from './correction.entity'
import { CorrectionLabelEntity } from '../label/correction-label/correction-label.entity'

@Injectable()
export class CorrectionService {
  constructor(
    private readonly eventService: EventService,

    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(CorrectionEntity)
    private readonly correctionRepository: Repository<CorrectionEntity>,
    @InjectRepository(CorrectionLabelEntity)
    private readonly correctionLabelRepository: Repository<CorrectionLabelEntity>
  ) {}

  /**
   * List all activities that need to be corrected or have been corrected by the user identified by `userId`.
   *
   * @remarks
   * - If `activityId` is provided, only the activity with the given id is returned.
   * - Only activities that have been terminated are returned.
   * - If `viewerMode` is true, the corrector assignment constraint is ignored.
   * @param correctorUserId The id of the user who will correct the activities.
   * @param activityId An optional activity id to filter the results.
   * @param viewerMode Whether this is a read-only visualization request.
   * @returns A list of activities to correct.
   */
  async list(correctorUserId: string, activityId?: string, viewerMode = false): Promise<ActivityCorrection[]> {
    type Projection = {
      userId: string
      activityId: string
      activityName: string
      activityNavigation: any
      exerciseId: string
      activitySessionId: string
      exerciseSessionId: string
      courseId: string
      courseName: string
      correctedBy?: string
      correctedAt?: Date
      correctedGrade?: number
      grade?: number
      exerciseName: string
      hasUploads: boolean
    }

    // In viewer mode, list exercise sessions directly from the activity without requiring answers.
    const answerJoin = viewerMode
      ? ''
      : `INNER JOIN LATERAL (
      SELECT * FROM "Answers" a
      WHERE a.session_id = exercise_session.id AND a.variables IS NOT NULL
      ORDER BY a.created_at DESC
      LIMIT 1
    ) answer ON true`

    const queryParams: string[] = []
    const userParam = viewerMode ? undefined : '$1'
    const activityParam = viewerMode ? '$1' : '$2'

    if (viewerMode) {
      if (activityId) {
        queryParams.push(activityId)
      }
    } else {
      queryParams.push(correctorUserId)
      if (activityId) {
        queryParams.push(activityId)
      }
    }

    const whereConditions = [
      activityId ? `activity.id=${activityParam}` : undefined,
      userParam ? `(exercise_session.user_id IS NULL OR exercise_session.user_id <> ${userParam})` : undefined,
      viewerMode ? undefined : 'answer.variables IS NOT NULL',
      viewerMode ? undefined : "(activity_session.variables->'navigation'->>'terminated')::boolean = TRUE",
      userParam
        ? `EXISTS (
        SELECT 1 FROM "ActivityCorrectorView" corrector
        WHERE corrector.activity_id=activity.id AND corrector.id=${userParam}
      )`
        : undefined,
    ].filter((condition): condition is string => !!condition)

    // Construct SQL query and parameters
    const queryText = `
    SELECT
      activity.id as "activityId",
      activity.source->'variables'->>'title' as "activityName",
      resources.id as "exerciseId",
      resources."name" as "exerciseName",
      (activity_session.variables->>'navigation')::jsonb as "activityNavigation",
      activity_session.id as "activitySessionId",
      exercise_session.user_id as "userId",
      exercise_session.id as "exerciseSessionId",
      course.id as "courseId",
      course.name as "courseName",
      correction.author_id as "correctedBy",
      COALESCE(correction.updated_at, correction.created_at) as "correctedAt",
      correction.grade as "correctedGrade",
      exercise_session.grade as "grade",
      CASE WHEN EXISTS (
        SELECT 1 FROM "StudentSubmissions"
        WHERE session_id = exercise_session.id
        LIMIT 1
      ) THEN true ELSE false END as "hasUploads"
    FROM "Sessions" exercise_session
    INNER JOIN "Resources" resources on resources.id = (exercise_session.source->>'resource')::uuid
    INNER JOIN "Sessions" activity_session ON activity_session.id=exercise_session.parent_id
    INNER JOIN "Activities" activity ON activity.id=exercise_session.activity_id
    INNER JOIN "Courses" course ON course.id=activity.course_id
    ${answerJoin}
    LEFT JOIN "Corrections" correction ON correction.id=exercise_session.correction_id
    WHERE
      ${whereConditions.join(' AND\n      ')}
  `

    const subQuery = `
      select
        l.*
      from "CorrectionLabels" cl
      left join "Labels" l on cl.label_id = l.id
      where cl.session_id = $1
    `
    const projections = (await this.sessionRepository.query(queryText, queryParams)) as Projection[]

    const activityMap = new Map<string, ActivityCorrection>()

    for (const projection of projections) {
      const navItem = projection.activityNavigation?.exercises?.find(
        (item: any) => item.sessionId === projection.exerciseSessionId
      )

      const exercise: ExerciseCorrection = {
        userId: projection.userId,
        activitySessionId: projection.activitySessionId,
        exerciseSessionId: projection.exerciseSessionId,
        correctedBy: projection.correctedBy,
        correctedAt: projection.correctedAt,
        correctedGrade: projection.correctedGrade,
        grade: projection.grade,
        exerciseId: navItem?.id ?? projection.exerciseId,
        exerciseName: projection.exerciseName,
        hasUploads: projection.hasUploads,
        labels: [],
      }

      const alreadyCorrected = exercise.correctedBy ?? false
      if (alreadyCorrected) {
        const labels = await this.correctionLabelRepository.query(subQuery, [projection.exerciseSessionId])
        exercise.labels = labels.map((label: any) => ({
          id: label.id,
          name: label.name,
          color: label.color,
          description: label.description,
          gradeChange: label.grade_change,
        }))
      }

      if (!activityMap.has(projection.activityId)) {
        activityMap.set(projection.activityId, {
          activityId: projection.activityId,
          activityName: projection.activityName,
          courseId: projection.courseId,
          courseName: projection.courseName,
          exercises: [exercise],
        })
      } else {
        activityMap.get(projection.activityId)?.exercises.push(exercise)
      }
    }

    return Array.from(activityMap.values())
  }

  async upsert(sessionId: string, input: Partial<CorrectionEntity>) {
    const exerciseSession = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { correction: true, parent: true, activity: true },
    })

    if (!exerciseSession) throw new NotFoundResponse(`Session not found: ${sessionId}`)
    if (!exerciseSession.parent) throw new NotFoundResponse(`Parent session not found: ${sessionId}`)

    let correction: CorrectionEntity
    if (exerciseSession.correction) {
      Object.assign(exerciseSession.correction, input)
      await this.correctionRepository.save(exerciseSession.correction)
      correction = exerciseSession.correction
    } else {
      correction = await this.correctionRepository.save(input)
      await this.sessionRepository.update(exerciseSession.id, {
        correctionId: correction.id,
      })
    }

    const activitySession = exerciseSession.parent
    const activityExerciseSessions = await this.sessionRepository.find({
      where: { parentId: activitySession.id },
      relations: { correction: true },
    })

    let terminated = true
    let grade = 0
    activityExerciseSessions.forEach((session) => {
      if (!session.correction) terminated = false
      else grade += session.correction.grade
    })

    if (terminated) {
      if (grade && activityExerciseSessions.length) {
        activitySession.grade = grade / activityExerciseSessions.length
        await this.sessionRepository.save(activitySession)
      }

      if (exerciseSession.activity && exerciseSession.userId) {
        this.eventService.emit<OnCorrectActivityEventPayload>(ON_CORRECT_ACTIVITY_EVENT, {
          userId: exerciseSession.userId,
          activity: exerciseSession.activity,
        })
      }
    }

    return correction
  }
}

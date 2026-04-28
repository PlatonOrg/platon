import { ExpandContext, Expander } from '@cisstech/nestjs-expand'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IRequest } from '@platon/core/server'
import { ResourceStatistic, ResourceTypes } from '@platon/feature/resource/common'
import { ResourceDTO, ResourceDependencyEntity, ResourceStatisticEntity } from '@platon/feature/resource/server'
import { In, Repository } from 'typeorm'
import { SessionDataEntity } from '../sessions/session-data.entity'

const BATCH_DEBOUNCE_MS = 5

type StatisticBatchLoader = {
  resources: ResourceDTO[]
  promise: Promise<Map<string, ResourceStatistic | undefined>>
  scheduleFlush: () => void
}

@Injectable()
@Expander(ResourceDTO)
export class ResourceExpander {
  constructor(
    @InjectRepository(SessionDataEntity)
    private readonly sessionData: Repository<SessionDataEntity>,

    @InjectRepository(ResourceStatisticEntity)
    private readonly statisticView: Repository<ResourceStatisticEntity>,

    @InjectRepository(ResourceDependencyEntity)
    private readonly dependencyRepo: Repository<ResourceDependencyEntity>
  ) {}

  async statistic(context: ExpandContext<IRequest, ResourceDTO>): Promise<ResourceStatistic | undefined> {
    const { parent, request } = context

    const loader = await request.memoize<StatisticBatchLoader>('statistic.batch.loader', async () => {
      const resources: ResourceDTO[] = []
      let flushTimeout: ReturnType<typeof setTimeout>
      let resolvePromise: (results: Map<string, ResourceStatistic | undefined>) => void

      const promise = new Promise<Map<string, ResourceStatistic | undefined>>((resolve) => {
        resolvePromise = resolve
      })

      const scheduleFlush = () => {
        clearTimeout(flushTimeout)
        flushTimeout = setTimeout(async () => {
          resolvePromise(await this.computeBatch(resources))
        }, BATCH_DEBOUNCE_MS)
      }

      return { resources, promise, scheduleFlush }
    })

    loader.resources.push(parent)
    loader.scheduleFlush()

    const result = await loader.promise
    return result.get(parent.id)
  }

  private async computeBatch(resources: ResourceDTO[]): Promise<Map<string, ResourceStatistic | undefined>> {
    if (resources.length === 0) return new Map()

    const uniqueResources = [...new Map(resources.map((r) => [r.id, r])).values()]
    const ids = uniqueResources.map((r) => r.id)

    type SessionsAggRow = {
      resource_id: string
      total_scores: string
      scored_sessions: string
      activity_attempts: string
      exercise_unique_attempts: string
    }

    const [statistics, sessionsAggRows, allDependencies] = await Promise.all([
      this.statisticView.find({ where: { id: In(ids) } }),
      this.sessionData.query(
        `SELECT
           resource_id,
           SUM(CASE WHEN attempts > 0 THEN GREATEST(COALESCE(correction_grade, grade), 0) ELSE 0 END) AS total_scores,
           COUNT(CASE WHEN attempts > 0 THEN 1 ELSE NULL END) AS scored_sessions,
           COUNT(CASE WHEN parent_id IS NULL AND attempts > 0 THEN 1 ELSE NULL END) AS activity_attempts,
           COUNT(CASE WHEN parent_id IS NOT NULL AND attempts > 0 THEN 1 ELSE NULL END) AS exercise_unique_attempts
         FROM "SessionData"
         WHERE resource_id = ANY($1) AND user_id IS NOT NULL
         GROUP BY resource_id`,
        [ids]
      ) as Promise<SessionsAggRow[]>,
      this.dependencyRepo.find({
        where: { dependOnId: In(ids) },
        select: { resourceId: true, dependOnId: true, resource: { type: true } },
        relations: { resource: true },
      }),
    ])

    const statsById = new Map(statistics.map((s) => [s.id, s]))

    const sessionsAggByResourceId = new Map<
      string,
      { avgScore: number; activityAttempts: number; exerciseUniqueAttempts: number }
    >()
    for (const row of sessionsAggRows) {
      const scored = Number(row.scored_sessions)
      sessionsAggByResourceId.set(row.resource_id, {
        avgScore: scored > 0 ? Math.round(Number(row.total_scores) / scored) : 0,
        activityAttempts: Number(row.activity_attempts),
        exerciseUniqueAttempts: Number(row.exercise_unique_attempts),
      })
    }

    const depsByDependOnId = new Map<string, ResourceDependencyEntity[]>()
    for (const dep of allDependencies) {
      const list = depsByDependOnId.get(dep.dependOnId) ?? []
      list.push(dep)
      depsByDependOnId.set(dep.dependOnId, list)
    }

    const allExerciseRefIds = new Set<string>()
    const exerciseRefIdsByResourceId = new Map<string, string[]>()

    for (const resource of uniqueResources) {
      const refs = depsByDependOnId.get(resource.id) ?? []
      const uniqueExerciseIds = new Set<string>()
      const seen = new Set<string>()

      for (const ref of refs) {
        if (!seen.has(ref.resourceId)) {
          seen.add(ref.resourceId)
          if (ref.resource.type === ResourceTypes.EXERCISE) {
            uniqueExerciseIds.add(ref.resourceId)
            allExerciseRefIds.add(ref.resourceId)
          }
        }
      }

      if (uniqueExerciseIds.size > 0) {
        const exerciseIds = [...uniqueExerciseIds, resource.id]
        exerciseRefIdsByResourceId.set(resource.id, exerciseIds)
        exerciseIds.forEach((id) => allExerciseRefIds.add(id))
      }
    }

    // 4th query: aggregate attempts per exercise reference ID
    const attemptsByResourceId = new Map<string, number>()
    if (allExerciseRefIds.size > 0) {
      const rows: { resource_id: string; total_attempts: string }[] = await this.sessionData.query(
        `SELECT resource_id, SUM(attempts) AS total_attempts
         FROM "SessionData"
         WHERE resource_id = ANY($1) AND user_id IS NOT NULL
         GROUP BY resource_id`,
        [Array.from(allExerciseRefIds)]
      )
      for (const row of rows) {
        attemptsByResourceId.set(row.resource_id, Number(row.total_attempts))
      }
    }

    // Build per-resource results
    const results = new Map<string, ResourceStatistic | undefined>()

    for (const resource of uniqueResources) {
      const statistic = statsById.get(resource.id)
      if (!statistic) {
        results.set(resource.id, undefined)
        continue
      }

      const agg = sessionsAggByResourceId.get(resource.id) ?? {
        avgScore: 0,
        activityAttempts: 0,
        exerciseUniqueAttempts: 0,
      }
      const refs = depsByDependOnId.get(resource.id) ?? []

      let refCount = 0
      let activityRefCount = 0
      let templateRefCount = 0
      let referencesAttemptCount = 0
      const uniqueResourceIds = new Set<string>()

      refs.forEach((ref) => {
        if (!uniqueResourceIds.has(ref.resourceId)) {
          uniqueResourceIds.add(ref.resourceId)
          activityRefCount += ref.resource.type === ResourceTypes.ACTIVITY ? 1 : 0
          templateRefCount += ref.resource.type === ResourceTypes.EXERCISE ? 1 : 0
        }
      })

      refCount = activityRefCount + templateRefCount

      if (refCount > 0) {
        const exerciseIds = exerciseRefIdsByResourceId.get(resource.id) ?? [resource.id]
        referencesAttemptCount = exerciseIds.reduce((total, eid) => total + (attemptsByResourceId.get(eid) ?? 0), 0)
      }

      results.set(resource.id, {
        score: statistic.score,
        members: statistic.members,
        watchers: statistic.watchers,
        circle:
          resource.type === ResourceTypes.CIRCLE
            ? {
                children: statistic.children,
                circles: statistic.circles,
                exercises: statistic.exercises,
                activities: statistic.activities,
                ready: statistic.ready,
                deprecated: statistic.deprecated,
                bugged: statistic.bugged,
                not_tested: statistic.not_tested,
                draft: statistic.draft,
              }
            : undefined,
        activity:
          resource.type === ResourceTypes.ACTIVITY
            ? {
                attemptCount: agg.activityAttempts,
                averageScore: agg.avgScore,
              }
            : undefined,
        exercise:
          resource.type === ResourceTypes.EXERCISE
            ? {
                attemptCount: agg.exerciseUniqueAttempts,
                averageScore: agg.avgScore,
                references: refCount
                  ? {
                      total: refCount,
                      activity: activityRefCount,
                      template: templateRefCount,
                      referencesAttemptCount,
                    }
                  : undefined,
              }
            : undefined,
      })
    }
    return results
  }
}

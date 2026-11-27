import { ExpandContext, Expander } from '@cisstech/nestjs-expand'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IRequest } from '@platon/core/server'
import { ResourceStatistic, ResourceTypes } from '@platon/feature/resource/common'
import { ResourceDTO, ResourceDependencyEntity, ResourceStatisticEntity } from '@platon/feature/resource/server'
import { In, Repository } from 'typeorm'
import { ResourceSessionStatsView } from '../sessions/session-stats.view'

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
    @InjectRepository(ResourceStatisticEntity)
    private readonly statisticView: Repository<ResourceStatisticEntity>,

    @InjectRepository(ResourceSessionStatsView)
    private readonly sessionStatsView: Repository<ResourceSessionStatsView>,

    @InjectRepository(ResourceDependencyEntity)
    private readonly dependencyRepo: Repository<ResourceDependencyEntity>
  ) {}

  private readonly logger = new Logger(ResourceExpander.name)

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
          try {
            resolvePromise(await this.computeBatch(resources))
          } catch (e) {
            this.logger.error('Failed to compute resource statistic batch', e)
            resolvePromise(new Map())
          }
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

    const [statistics, sessionStats, allDependencies] = await Promise.all([
      this.statisticView.find({ where: { id: In(ids) } }),
      this.sessionStatsView.find({ where: { resourceId: In(ids) } }),
      this.dependencyRepo.find({
        where: { dependOnId: In(ids) },
        select: { resourceId: true, dependOnId: true, isTemplate: true },
      }),
    ])

    const statsById = new Map(statistics.map((s) => [s.id, s]))
    const sessionStatsByResourceId = new Map(sessionStats.map((s) => [s.resourceId, s]))

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
          if (ref.isTemplate) {
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

    // Fetch session stats for exercise ref IDs not already in the batch
    const missingRefIds = [...allExerciseRefIds].filter((id) => !sessionStatsByResourceId.has(id))
    if (missingRefIds.length > 0) {
      const extraStats = await this.sessionStatsView.find({ where: { resourceId: In(missingRefIds) } })
      for (const s of extraStats) {
        sessionStatsByResourceId.set(s.resourceId, s)
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

      const agg = sessionStatsByResourceId.get(resource.id)
      const refs = depsByDependOnId.get(resource.id) ?? []

      let refCount = 0
      let activityRefCount = 0
      let templateRefCount = 0
      let referencesAttemptCount = 0
      const uniqueResourceIds = new Set<string>()

      refs.forEach((ref) => {
        if (!uniqueResourceIds.has(ref.resourceId)) {
          uniqueResourceIds.add(ref.resourceId)
          activityRefCount += ref.isTemplate ? 0 : 1
          templateRefCount += ref.isTemplate ? 1 : 0
        }
      })

      refCount = activityRefCount + templateRefCount

      if (refCount > 0) {
        const exerciseIds = exerciseRefIdsByResourceId.get(resource.id) ?? [resource.id]
        referencesAttemptCount = exerciseIds.reduce(
          (total, eid) => total + Number(sessionStatsByResourceId.get(eid)?.totalAttempts ?? 0),
          0
        )
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
                attemptCount: agg?.activityAttempts ?? 0,
                averageScore: agg?.avgScore ?? 0,
              }
            : undefined,
        exercise:
          resource.type === ResourceTypes.EXERCISE
            ? {
                attemptCount: agg?.exerciseUniqueAttempts ?? 0,
                averageScore: agg?.avgScore ?? 0,
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

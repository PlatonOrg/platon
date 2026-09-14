import { ExpandContext } from '@cisstech/nestjs-expand'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { IRequest } from '@platon/core/server'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { ResourceDependencyEntity, ResourceDTO, ResourceStatisticEntity } from '@platon/feature/resource/server'
import { ResourceSessionStatsView } from '../sessions/session-stats.view'
import { ResourceExpander } from './resource.expander'

const createMemoizedRequest = (): IRequest => {
  const cache = new Map<string, Promise<unknown>>()
  return {
    memoize: <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      if (!cache.has(key)) {
        cache.set(key, fn())
      }
      return cache.get(key) as Promise<T>
    },
  } as unknown as IRequest
}

describe('ResourceExpander', () => {
  let expander: ResourceExpander
  let statisticView: MockRepository<ResourceStatisticEntity>
  let sessionStatsView: MockRepository<ResourceSessionStatsView>
  let dependencyRepo: MockRepository<ResourceDependencyEntity>

  beforeEach(async () => {
    statisticView = mockRepository<ResourceStatisticEntity>()
    sessionStatsView = mockRepository<ResourceSessionStatsView>()
    dependencyRepo = mockRepository<ResourceDependencyEntity>()

    const module = await Test.createTestingModule({
      providers: [
        ResourceExpander,
        { provide: getRepositoryToken(ResourceStatisticEntity), useValue: statisticView },
        { provide: getRepositoryToken(ResourceSessionStatsView), useValue: sessionStatsView },
        { provide: getRepositoryToken(ResourceDependencyEntity), useValue: dependencyRepo },
      ],
    }).compile()

    expander = module.get(ResourceExpander)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('devrait retourner undefined si aucune statistique ne correspond à la ressource', async () => {
    statisticView.find.mockResolvedValue([])
    sessionStatsView.find.mockResolvedValue([])
    dependencyRepo.find.mockResolvedValue([])

    const request = createMemoizedRequest()
    const promise = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.EXERCISE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result).toBeUndefined()
  })

  it("devrait retourner les stats d'exercice à partir des agrégats de session", async () => {
    statisticView.find.mockResolvedValue([{ id: 'res-1', score: 90, members: 3, watchers: 1 }] as never)
    sessionStatsView.find.mockResolvedValue([{ resourceId: 'res-1', exerciseUniqueAttempts: 5, avgScore: 80 }] as never)
    dependencyRepo.find.mockResolvedValue([])

    const request = createMemoizedRequest()
    const promise = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.EXERCISE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result?.exercise?.attemptCount).toBe(5)
    expect(result?.exercise?.averageScore).toBe(80)
    expect(result?.activity).toBeUndefined()
  })

  it("devrait retourner les stats d'activité à partir des agrégats de session", async () => {
    statisticView.find.mockResolvedValue([{ id: 'res-1', score: 90, members: 3, watchers: 1 }] as never)
    sessionStatsView.find.mockResolvedValue([{ resourceId: 'res-1', activityAttempts: 7, avgScore: 60 }] as never)
    dependencyRepo.find.mockResolvedValue([])

    const request = createMemoizedRequest()
    const promise = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.ACTIVITY } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result?.activity?.attemptCount).toBe(7)
    expect(result?.activity?.averageScore).toBe(60)
  })

  it('devrait retourner les stats de circle', async () => {
    statisticView.find.mockResolvedValue([
      { id: 'res-1', score: 90, members: 3, watchers: 1, children: 4, circles: 1, exercises: 2, activities: 1 },
    ] as never)
    sessionStatsView.find.mockResolvedValue([])
    dependencyRepo.find.mockResolvedValue([])

    const request = createMemoizedRequest()
    const promise = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.CIRCLE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result?.circle?.children).toBe(4)
  })

  it('devrait regrouper plusieurs appels dans la même requête en un seul chargement en base', async () => {
    statisticView.find.mockResolvedValue([
      { id: 'res-1', score: 1, members: 0, watchers: 0 },
      { id: 'res-2', score: 2, members: 0, watchers: 0 },
    ] as never)
    sessionStatsView.find.mockResolvedValue([])
    dependencyRepo.find.mockResolvedValue([])

    const request = createMemoizedRequest()
    const promise1 = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.EXERCISE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    const promise2 = expander.statistic({
      parent: { id: 'res-2', type: ResourceTypes.EXERCISE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    await Promise.all([promise1, promise2])

    expect(statisticView.find).toHaveBeenCalledTimes(1)
    expect(statisticView.find).toHaveBeenCalledWith({ where: { id: expect.anything() } })
  })

  it('devrait résoudre à undefined pour chaque ressource si le calcul du batch échoue', async () => {
    statisticView.find.mockRejectedValue(new Error('db down'))

    const request = createMemoizedRequest()
    const promise = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.EXERCISE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result).toBeUndefined()
  })

  it('devrait calculer les références de templates pour un exercice référencé, en agrégeant les tentatives des copies template', async () => {
    statisticView.find.mockResolvedValue([{ id: 'res-1', score: 1, members: 0, watchers: 0 }] as never)
    dependencyRepo.find.mockResolvedValue([
      { resourceId: 'activity-1', dependOnId: 'res-1', isTemplate: true },
    ] as never)
    sessionStatsView.find
      .mockResolvedValueOnce([
        { resourceId: 'res-1', exerciseUniqueAttempts: 2, avgScore: 50, totalAttempts: 3 },
      ] as never)
      .mockResolvedValueOnce([{ resourceId: 'activity-1', totalAttempts: 4 }] as never)

    const request = createMemoizedRequest()
    const promise = expander.statistic({
      parent: { id: 'res-1', type: ResourceTypes.EXERCISE } as ResourceDTO,
      request,
    } as ExpandContext<IRequest, ResourceDTO>)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result?.exercise?.references?.total).toBe(1)
    expect(result?.exercise?.references?.template).toBe(1)
    expect(result?.exercise?.references?.referencesAttemptCount).toBe(7)
  })
})

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserEntity } from '@platon/core/server'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { ActivityEntity } from '@platon/feature/course/server'
import { ActivityResultsVirtualColumnsResolver } from './activity-results-virtual-columns.resolver'
import { SessionEntity } from '../sessions/session.entity'

describe('ActivityResultsVirtualColumnsResolver', () => {
  let resolver: ActivityResultsVirtualColumnsResolver
  let sessionRepository: MockRepository<SessionEntity>

  beforeEach(async () => {
    sessionRepository = mockRepository<SessionEntity>()

    const module = await Test.createTestingModule({
      providers: [
        ActivityResultsVirtualColumnsResolver,
        { provide: getRepositoryToken(SessionEntity), useValue: sessionRepository },
      ],
    }).compile()

    resolver = module.get(ActivityResultsVirtualColumnsResolver)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('ne devrait rien faire sans activité', async () => {
    await resolver.resolve([], { id: 'user-1' } as UserEntity)

    expect(sessionRepository.find).not.toHaveBeenCalled()
  })

  it('ne devrait rien modifier pour une activité sans session correspondante', async () => {
    sessionRepository.find.mockResolvedValue([])
    const activity = { id: 'activity-1' } as ActivityEntity

    await resolver.resolve([activity], { id: 'user-1' } as UserEntity)

    expect((activity as unknown as Record<string, unknown>)['timeSpent']).toBeUndefined()
  })

  it('devrait calculer timeSpent depuis lastGradedAt/startedAt', async () => {
    const startedAt = new Date('2024-01-01T00:00:00Z')
    const lastGradedAt = new Date('2024-01-01T00:05:00Z')
    sessionRepository.find.mockResolvedValue([
      { activityId: 'activity-1', startedAt, lastGradedAt, variables: {} },
    ] as unknown as SessionEntity[])
    const activity = { id: 'activity-1' } as ActivityEntity

    await resolver.resolve([activity], { id: 'user-1' } as UserEntity)

    expect((activity as unknown as Record<string, unknown>)['timeSpent']).toBe(300)
  })

  it('devrait calculer la progression à partir des exercices de navigation', async () => {
    sessionRepository.find.mockResolvedValue([
      {
        activityId: 'activity-1',
        variables: {
          navigation: {
            exercises: [{ state: 'SUCCEEDED' }, { state: 'STARTED' }, { state: 'NOT_STARTED' }],
          },
        },
      },
    ] as unknown as SessionEntity[])
    const activity = { id: 'activity-1' } as ActivityEntity

    await resolver.resolve([activity], { id: 'user-1' } as UserEntity)

    expect((activity as unknown as Record<string, unknown>)['progression']).toBe(Math.round((100 * 1 + 10 * 1) / 3))
  })

  it('ne devrait pas calculer la progression sans exercices de navigation', async () => {
    sessionRepository.find.mockResolvedValue([
      { activityId: 'activity-1', variables: {} },
    ] as unknown as SessionEntity[])
    const activity = { id: 'activity-1' } as ActivityEntity

    await resolver.resolve([activity], { id: 'user-1' } as UserEntity)

    expect((activity as unknown as Record<string, unknown>)['progression']).toBeUndefined()
  })
})

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActivityEntity } from '@platon/feature/course/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { SelectQueryBuilder } from 'typeorm'
import { LeaderboardService } from './leaderboard.service'
import { LeaderboardView } from './leaderboard.view'

describe('LeaderboardService', () => {
  let service: LeaderboardService
  let leaderboardView: MockRepository<LeaderboardView> & { query: jest.Mock }
  let activityRepository: MockRepository<ActivityEntity>

  beforeEach(async () => {
    leaderboardView = { ...mockRepository<LeaderboardView>(), query: jest.fn() }
    activityRepository = mockRepository<ActivityEntity>()

    const module = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: getRepositoryToken(LeaderboardView), useValue: leaderboardView },
        { provide: getRepositoryToken(ActivityEntity), useValue: activityRepository },
      ],
    }).compile()

    service = module.get(LeaderboardService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('onChallengeSucceeded', () => {
    it('devrait rafraîchir la vue matérialisée', async () => {
      await service.onChallengeSucceeded()

      expect(leaderboardView.query).toHaveBeenCalledWith(`REFRESH MATERIALIZED VIEW "LeaderboardView"`)
    })
  })

  describe('ofActivity', () => {
    it('devrait calculer le rang et les points de chaque entrée', async () => {
      activityRepository.findOneOrFail.mockResolvedValue({
        source: { variables: { exerciseGroups: [{ exercises: [{ id: 'ex-1' }] }] } },
      } as unknown as ActivityEntity)

      const qb = mockSelectQueryBuilder<LeaderboardView>()
      qb.getMany.mockResolvedValue([
        { user: { id: 'u1' }, grade: 100, startedAt: new Date(), succeededAt: new Date(), lastGradedAt: new Date() },
        { user: { id: 'u2' }, grade: 90, startedAt: new Date(), succeededAt: new Date(), lastGradedAt: new Date() },
      ] as LeaderboardView[])
      leaderboardView.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<LeaderboardView>)

      const result = await service.ofActivity('activity-1', 100)

      expect(result).toHaveLength(2)
      expect(result[0].rank).toBe(1)
      expect(result[1].rank).toBe(2)
      expect(result[0].points).toBeGreaterThan(result[1].points)
    })
  })

  describe('ofCourse', () => {
    it('devrait agréger les points par utilisateur sur toutes les activités défi du cours', async () => {
      activityRepository.find.mockResolvedValue([{ id: 'activity-1' }, { id: 'activity-2' }] as ActivityEntity[])
      activityRepository.findOneOrFail.mockResolvedValue({
        source: { variables: { exerciseGroups: [] } },
      } as unknown as ActivityEntity)

      const user = { id: 'u1' }
      const qb = mockSelectQueryBuilder<LeaderboardView>()
      qb.getMany.mockResolvedValue([
        { user, grade: 100, startedAt: new Date(), succeededAt: new Date(), lastGradedAt: new Date() },
      ] as LeaderboardView[])
      leaderboardView.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<LeaderboardView>)

      const result = await service.ofCourse('course-1')

      expect(activityRepository.find).toHaveBeenCalledWith({
        where: { courseId: 'course-1', isChallenge: true },
        select: ['id'],
      })
      expect(result).toHaveLength(1)
      expect(result[0].user.id).toBe('u1')
      expect(result[0].points).toBeGreaterThan(0)
      expect(result[0].rank).toBe(1)
    })

    it("devrait retourner un tableau vide si aucune activité défi n'existe", async () => {
      activityRepository.find.mockResolvedValue([])

      const result = await service.ofCourse('course-1')

      expect(result).toEqual([])
    })
  })
})

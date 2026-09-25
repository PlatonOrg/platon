import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { mockRepository, MockRepository } from '@platon/core/testing/server'
import { LessonProgressService } from './lesson-progress.service'
import { CourseLessonProgressEntity } from './lesson-progress.entity'

describe('LessonProgressService', () => {
  let service: LessonProgressService
  let repository: MockRepository<CourseLessonProgressEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonProgressService,
        {
          provide: getRepositoryToken(CourseLessonProgressEntity),
          useValue: mockRepository<CourseLessonProgressEntity>(),
        },
      ],
    }).compile()

    service = module.get(LessonProgressService)
    repository = module.get(getRepositoryToken(CourseLessonProgressEntity))
  })

  describe('markCompleted()', () => {
    it("crée un enregistrement de progression quand aucun n'existe pour cette activité/utilisateur", async () => {
      repository.findOne.mockResolvedValue(null)

      await service.markCompleted('activity-1', 'user-1')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { activityId: 'activity-1', userId: 'user-1' } })
      expect(repository.save).toHaveBeenCalledTimes(1)
      const saved = repository.save.mock.calls[0][0] as Partial<CourseLessonProgressEntity>
      expect(saved.activityId).toBe('activity-1')
      expect(saved.userId).toBe('user-1')
      expect(saved.completedAt).toBeInstanceOf(Date)
    })

    it('est idempotent : ne recrée rien si une progression existe déjà', async () => {
      repository.findOne.mockResolvedValue({ id: 'progress-1' } as CourseLessonProgressEntity)

      await service.markCompleted('activity-1', 'user-1')

      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('findCompletedActivityIds()', () => {
    it('retourne un Set vide sans requêter la base si activityIds est vide', async () => {
      const result = await service.findCompletedActivityIds([], 'user-1')

      expect(result).toEqual(new Set())
      expect(repository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('retourne les activityId trouvés sous forme de Set, filtrés par utilisateur', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ activityId: 'activity-1' }, { activityId: 'activity-2' }]),
      }
      repository.createQueryBuilder.mockReturnValue(qb as any)

      const result = await service.findCompletedActivityIds(['activity-1', 'activity-2', 'activity-3'], 'user-1')

      expect(qb.where).toHaveBeenCalledWith('progress.activity_id IN (:...activityIds)', {
        activityIds: ['activity-1', 'activity-2', 'activity-3'],
      })
      expect(qb.andWhere).toHaveBeenCalledWith('progress.user_id = :userId', { userId: 'user-1' })
      expect(result).toEqual(new Set(['activity-1', 'activity-2']))
    })
  })
})

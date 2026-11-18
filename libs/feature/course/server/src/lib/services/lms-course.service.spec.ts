import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { LmsCourseEntity } from '../entites/lms-course.entity'
import { LmsCourseService } from './lms-course.service'

describe('LmsCourseService', () => {
  let service: LmsCourseService
  let repository: MockRepository<LmsCourseEntity>

  beforeEach(async () => {
    repository = mockRepository<LmsCourseEntity>()

    const module = await Test.createTestingModule({
      providers: [LmsCourseService, { provide: getRepositoryToken(LmsCourseEntity), useValue: repository }],
    }).compile()

    service = module.get(LmsCourseService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('devrait sauvegarder la liaison LMS/cours', async () => {
      const data = { ltiPlatformId: 'lms-1', lmsCourseId: 'ctx-1', courseId: 'course-1' }
      repository.save.mockResolvedValue(data as LmsCourseEntity)

      await expect(service.create(data)).resolves.toBe(data)
      expect(repository.save).toHaveBeenCalledWith(data)
    })
  })

  describe('findLmsCourseFromLTI', () => {
    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect((await service.findLmsCourseFromLTI('ctx-1', 'lms-1')).isEmpty()).toBe(true)
    })

    it('ne devrait pas interroger la base sans id de cours LMS (TypeORM ignorerait la condition)', async () => {
      await expect((await service.findLmsCourseFromLTI(undefined as unknown as string, 'lms-1')).isEmpty()).toBe(true)
      expect(repository.findOne).not.toHaveBeenCalled()
    })

    it('devrait chercher par lmsCourseId et ltiPlatformId', async () => {
      repository.findOne.mockResolvedValue(null)

      await service.findLmsCourseFromLTI('ctx-1', 'lms-1')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { lmsCourseId: 'ctx-1', ltiPlatformId: 'lms-1' } })
    })
  })
})

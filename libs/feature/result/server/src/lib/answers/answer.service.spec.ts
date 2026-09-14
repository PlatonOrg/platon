import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { EntityManager } from 'typeorm'
import { AnswerEntity } from './answer.entity'
import { AnswerService } from './answer.service'

describe('AnswerService', () => {
  let service: AnswerService
  let repository: MockRepository<AnswerEntity>

  beforeEach(async () => {
    repository = mockRepository<AnswerEntity>()

    const module = await Test.createTestingModule({
      providers: [AnswerService, { provide: getRepositoryToken(AnswerEntity), useValue: repository }],
    }).compile()

    service = module.get(AnswerService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findGradesOfSession', () => {
    it('devrait retourner uniquement les notes triées par date de création', async () => {
      repository.find.mockResolvedValue([{ grade: 5 }, { grade: 8 }] as AnswerEntity[])

      const result = await service.findGradesOfSession('session-1')

      expect(repository.find).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        select: { grade: true },
        order: { createdAt: 'ASC' },
      })
      expect(result).toEqual([5, 8])
    })
  })

  describe('findAllOfSession', () => {
    it('devrait retourner toutes les réponses de la session', async () => {
      repository.find.mockResolvedValue([])

      await service.findAllOfSession('session-1')

      expect(repository.find).toHaveBeenCalledWith({ where: { sessionId: 'session-1' } })
    })
  })

  describe('create', () => {
    it('devrait sauvegarder via le repository sans entityManager', async () => {
      const created = { id: 'a1' } as AnswerEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.create({ sessionId: 'session-1' })

      expect(repository.save).toHaveBeenCalledWith(created)
      expect(result).toBe(created)
    })

    it("devrait utiliser l'entityManager fourni au lieu du repository", async () => {
      const created = { id: 'a1' } as AnswerEntity
      const entityManager = {
        create: jest.fn().mockReturnValue(created),
        save: jest.fn().mockResolvedValue(created),
      } as unknown as EntityManager

      const result = await service.create({ sessionId: 'session-1' }, entityManager)

      expect(entityManager.save).toHaveBeenCalledWith(created)
      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(created)
    })
  })
})

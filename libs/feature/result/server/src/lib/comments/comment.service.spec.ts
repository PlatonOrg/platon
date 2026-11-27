import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { SessionCommentEntity } from './comment.entity'
import { SessionCommentService } from './comment.service'

describe('SessionCommentService', () => {
  let service: SessionCommentService
  let repository: MockRepository<SessionCommentEntity>

  beforeEach(async () => {
    repository = mockRepository<SessionCommentEntity>()

    const module = await Test.createTestingModule({
      providers: [SessionCommentService, { provide: getRepositoryToken(SessionCommentEntity), useValue: repository }],
    }).compile()

    service = module.get(SessionCommentService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('devrait lister les commentaires triés par date de création', async () => {
      repository.findAndCount.mockResolvedValue([[], 0])

      await service.findAll('session-1', 'answer-1')

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', answerId: 'answer-1' },
        order: { createdAt: 'ASC' },
      })
    })
  })

  describe('create', () => {
    it('devrait créer un commentaire', async () => {
      const created = { id: 'c1' } as SessionCommentEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.create({ sessionId: 'session-1' })

      expect(result).toBe(created)
    })
  })

  describe('delete', () => {
    it('devrait supprimer le commentaire ciblé', async () => {
      await service.delete('session-1', 'answer-1', 'comment-1')

      expect(repository.delete).toHaveBeenCalledWith({
        sessionId: 'session-1',
        answerId: 'answer-1',
        id: 'comment-1',
      })
    })
  })
})

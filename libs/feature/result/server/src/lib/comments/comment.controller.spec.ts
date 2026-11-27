import { Test } from '@nestjs/testing'
import { IRequest } from '@platon/core/server'
import { SessionCommentController } from './comment.controller'
import { SessionCommentEntity } from './comment.entity'
import { SessionCommentService } from './comment.service'

describe('SessionCommentController', () => {
  let controller: SessionCommentController
  let service: jest.Mocked<Pick<SessionCommentService, 'findAll' | 'create' | 'delete'>>
  const req = { user: { id: 'user-1' } } as IRequest

  beforeEach(async () => {
    service = { findAll: jest.fn(), create: jest.fn(), delete: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [SessionCommentController, { provide: SessionCommentService, useValue: service }],
    }).compile()

    controller = module.get(SessionCommentController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('list devrait retourner la liste mappée', async () => {
    service.findAll.mockResolvedValue([[{ id: 'c1' } as SessionCommentEntity], 1])

    const result = await controller.list('session-1', 'answer-1')

    expect(service.findAll).toHaveBeenCalledWith('session-1', 'answer-1')
    expect(result.total).toBe(1)
  })

  it('create devrait injecter sessionId/answerId/authorId depuis la requête', async () => {
    service.create.mockResolvedValue({ id: 'c1' } as SessionCommentEntity)

    await controller.create(req, 'session-1', 'answer-1', { content: 'hello' } as never)

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-1', answerId: 'answer-1', authorId: 'user-1', content: 'hello' })
    )
  })

  it('delete devrait déléguer au service', async () => {
    await controller.delete('session-1', 'answer-1', 'comment-1')

    expect(service.delete).toHaveBeenCalledWith('session-1', 'answer-1', 'comment-1')
  })
})

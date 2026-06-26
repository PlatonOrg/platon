import { Test, TestingModule } from '@nestjs/testing'
import { IRequest } from '@platon/core/server'
import { createUserEntity } from '@platon/core/testing/server'
import { FeedbackCategoryValue } from '@platon/feature/player/common'
import { FeedbackController } from './feedback.controller'
import { FeedbackDTO } from './feedback.dto'
import { FeedbackService } from './feedback.service'

describe('FeedbackController', () => {
  let controller: FeedbackController
  let service: jest.Mocked<FeedbackService>

  const mockUser = createUserEntity({ id: 'sender-test-id' })
  const mockReq = { user: mockUser } as unknown as IRequest

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        {
          provide: FeedbackService,
          useValue: {
            submitFeedback: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(FeedbackController)
    service = module.get(FeedbackService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('POST /player/feedback', () => {
    it('should delegate to the service with the authenticated user id', async () => {
      service.submitFeedback.mockResolvedValue(undefined)

      const input: FeedbackDTO = {
        sessionId: 'session-test-id',
        exerciseTitle: 'Connaissez vous les drapeaux ?',
        category: FeedbackCategoryValue.STATEMENT,
        message: "L'énoncé n'est pas assez explicite.",
      }
      await controller.submitFeedback(mockReq, input)

      expect(service.submitFeedback).toHaveBeenCalledWith(input, mockUser.id)
    })

    it('should propagate errors thrown by the service', async () => {
      service.submitFeedback.mockRejectedValue(new Error('No creator found for session session-test-id.'))

      const input: FeedbackDTO = {
        sessionId: 'session-test-id',
        category: FeedbackCategoryValue.OTHER,
      }

      await expect(controller.submitFeedback(mockReq, input)).rejects.toThrow('No creator found')
    })
  })
})

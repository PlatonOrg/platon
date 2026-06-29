import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { EmailService } from '@platon/feature/email/server'
import { FeedbackCategoryValue } from '@platon/feature/player/common'
import { SessionEntity } from '@platon/feature/result/server'
import { mockRepository, MockRepository } from '@platon/core/testing/server'
import { FeedbackDTO } from './feedback.dto'
import { FeedbackEntity } from './feedback.entity'
import { FeedbackService } from './feedback.service'

describe('FeedbackService', () => {
  let service: FeedbackService
  let feedbackRepository: MockRepository<FeedbackEntity>
  let sessionRepository: { query: jest.Mock }
  let emailService: jest.Mocked<Pick<EmailService, 'send' | 'sendToPlatonTeam'>>

  const baseInput: FeedbackDTO = {
    sessionId: 'session-test-id',
    exerciseTitle: 'Connaissez vous les drapeaux ?',
    category: FeedbackCategoryValue.STATEMENT,
    message: "L'énoncé n'est pas assez explicite.",
  }

  const creatorRow = {
    creatorId: 'creator-test-id',
    firstName: 'Dominique',
    lastName: 'Revuz',
    email: 'dominique.revuz@univ-eiffel.fr',
  }

  beforeEach(async () => {
    feedbackRepository = mockRepository<FeedbackEntity>()
    feedbackRepository.create.mockImplementation((data) => data as FeedbackEntity)
    sessionRepository = { query: jest.fn().mockResolvedValue([creatorRow]) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: getRepositoryToken(FeedbackEntity), useValue: feedbackRepository },
        { provide: getRepositoryToken(SessionEntity), useValue: sessionRepository },
        {
          provide: EmailService,
          useValue: {
            send: jest.fn().mockResolvedValue(true),
            sendToPlatonTeam: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile()

    service = module.get(FeedbackService)
    emailService = module.get(EmailService)
  })

  afterEach(() => jest.clearAllMocks())

  it('should throw when no creator can be resolved for the session', async () => {
    sessionRepository.query.mockResolvedValue([])

    await expect(service.submitFeedback(baseInput, 'sender-test-id')).rejects.toThrow()
    expect(feedbackRepository.save).not.toHaveBeenCalled()
    expect(emailService.send).not.toHaveBeenCalled()
    expect(emailService.sendToPlatonTeam).not.toHaveBeenCalled()
  })

  it('should attach the resolved creatorId and the senderId to the persisted entity', async () => {
    await service.submitFeedback(baseInput, 'sender-test-id')

    expect(feedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: baseInput.sessionId,
        category: baseInput.category,
        creatorId: creatorRow.creatorId,
        senderId: 'sender-test-id',
      })
    )
    expect(feedbackRepository.save).toHaveBeenCalledTimes(1)
  })

  it.each([
    [FeedbackCategoryValue.STATEMENT, true, false],
    [FeedbackCategoryValue.ANSWER, true, false],
    [FeedbackCategoryValue.ACCESSIBILITY, true, true],
    [FeedbackCategoryValue.TECHNICAL, false, true],
    [FeedbackCategoryValue.OTHER, false, true],
  ])('category %s should notify creator=%s and PLaTOn team=%s', async (category, notifiesCreator, notifiesTeam) => {
    await service.submitFeedback({ ...baseInput, category }, 'sender-test-id')

    if (notifiesCreator) {
      expect(emailService.send).toHaveBeenCalledWith(expect.objectContaining({ to: creatorRow.email }))
    } else {
      expect(emailService.send).not.toHaveBeenCalled()
    }

    if (notifiesTeam) {
      expect(emailService.sendToPlatonTeam).toHaveBeenCalled()
    } else {
      expect(emailService.sendToPlatonTeam).not.toHaveBeenCalled()
    }
  })

  it('should still persist the feedback even when every notification fails to send', async () => {
    emailService.send.mockResolvedValue(false)
    emailService.sendToPlatonTeam.mockResolvedValue(false)

    await service.submitFeedback({ ...baseInput, category: FeedbackCategoryValue.ACCESSIBILITY }, 'sender-test-id')

    expect(feedbackRepository.save).toHaveBeenCalledTimes(1)
  })
})

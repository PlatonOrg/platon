import { Test } from '@nestjs/testing'
import { IRequest } from '@platon/core/server'
import { NotFoundResponse } from '@platon/core/common'
import { Optional } from 'typescript-optional'
import { TestController } from './test.controller'
import { TestEntity } from './test.entity'
import { TestService } from './test.service'

describe('TestController', () => {
  let controller: TestController
  let service: jest.Mocked<
    Pick<
      TestService,
      | 'createTest'
      | 'getTestByCourseId'
      | 'getCompletedTestTerms'
      | 'updateTestTerms'
      | 'updateTestMailContent'
      | 'sendAllMails'
      | 'sendMailToCandidate'
    >
  >
  const req = { user: { id: 'user-1' } } as IRequest

  beforeEach(async () => {
    service = {
      createTest: jest.fn(),
      getTestByCourseId: jest.fn(),
      getCompletedTestTerms: jest.fn(),
      updateTestTerms: jest.fn(),
      updateTestMailContent: jest.fn(),
      sendAllMails: jest.fn(),
      sendMailToCandidate: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [TestController, { provide: TestService, useValue: service }],
    }).compile()

    controller = module.get(TestController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createTest', () => {
    it('devrait créer le test et retourner la ressource', async () => {
      const test = { id: 'test-1', courseId: 'course-1' } as TestEntity
      service.createTest.mockResolvedValue(test)

      const result = await controller.createTest(req, { courseId: 'course-1' })

      expect(service.createTest).toHaveBeenCalledWith({ courseId: 'course-1' })
      expect(result.resource.courseId).toBe('course-1')
    })
  })

  describe('getTestByCourseId', () => {
    it('devrait retourner le test trouvé', async () => {
      service.getTestByCourseId.mockResolvedValue(Optional.of({ id: 'test-1', courseId: 'course-1' } as TestEntity))

      const result = await controller.getTestByCourseId(req, 'course-1')

      expect(result.resource.courseId).toBe('course-1')
    })

    it("devrait lever une NotFoundResponse si le test n'existe pas", async () => {
      service.getTestByCourseId.mockResolvedValue(Optional.empty())

      await expect(controller.getTestByCourseId(req, 'missing')).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('getCompletedTestTerms', () => {
    it('devrait déléguer au service avec le testId et le user courant', async () => {
      service.getCompletedTestTerms.mockResolvedValue({ blocks: [] } as never)

      const result = await controller.getCompletedTestTerms(req, 'test-1')

      expect(service.getCompletedTestTerms).toHaveBeenCalledWith('test-1', req.user)
      expect(result.resource).toEqual({ blocks: [] })
    })
  })

  describe('updateTestTerms', () => {
    it('devrait déléguer au service', async () => {
      await controller.updateTestTerms(req, 'test-1', { terms: { blocks: [] } } as never)

      expect(service.updateTestTerms).toHaveBeenCalledWith('test-1', { blocks: [] })
    })
  })

  describe('updateTestMailContent', () => {
    it('devrait déléguer au service', async () => {
      await controller.updateTestMailContent(req, 'test-1', {
        mailContent: { blocks: [] },
        mailSubject: 'Subject',
      } as never)

      expect(service.updateTestMailContent).toHaveBeenCalledWith('test-1', { blocks: [] }, 'Subject')
    })
  })

  describe('sendAllMails', () => {
    it("devrait déléguer au service avec l'origin et le user courant", async () => {
      await controller.sendAllMails('https://platon.test', req, 'test-1')

      expect(service.sendAllMails).toHaveBeenCalledWith('test-1', 'https://platon.test', req.user)
    })
  })

  describe('sendMailToCandidate', () => {
    it("devrait déléguer au service avec le testId, le courseMemberId et l'origin", async () => {
      await controller.sendMailToCandidate('https://platon.test', req, 'test-1', 'member-1')

      expect(service.sendMailToCandidate).toHaveBeenCalledWith('test-1', 'member-1', 'https://platon.test', req.user)
    })
  })
})

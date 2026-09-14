import { Test } from '@nestjs/testing'
import { IRequest } from '@platon/core/server'
import { TestsCandidatesController } from './tests-candidates.controller'
import { TestsCandidatesEntity } from './tests-candidates.entity'
import { TestsCandidatesService } from './tests-candidates.service'

describe('TestsCandidatesController', () => {
  let controller: TestsCandidatesController
  let service: jest.Mocked<Pick<TestsCandidatesService, 'createMany' | 'signInWithInvitation'>>
  const req = { user: { id: 'teacher-1' } } as IRequest

  beforeEach(async () => {
    service = { createMany: jest.fn(), signInWithInvitation: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [TestsCandidatesController, { provide: TestsCandidatesService, useValue: service }],
    }).compile()

    controller = module.get(TestsCandidatesController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createMany', () => {
    it('devrait créer plusieurs candidats et retourner les ressources mappées', async () => {
      const candidates = [
        { id: 'c1', userId: 'u1', courseMemberId: 'm1', linkId: 'link1' },
        { id: 'c2', userId: 'u2', courseMemberId: 'm2', linkId: 'link2' },
      ] as TestsCandidatesEntity[]
      service.createMany.mockResolvedValue(candidates)

      const result = await controller.createMany(req, [
        { userId: 'u1', courseMemberId: 'm1' },
        { userId: 'u2', courseMemberId: 'm2' },
      ] as never)

      expect(service.createMany).toHaveBeenCalled()
      expect(result.resource).toHaveLength(2)
      expect(result.resource[0].linkId).toBe('link1')
    })
  })

  describe('signInWithInvitation', () => {
    it('devrait déléguer au service et retourner le token/testId', async () => {
      service.signInWithInvitation.mockResolvedValue({
        authToken: { accessToken: 'a', refreshToken: 'r' } as never,
        testId: 'test-1',
      })

      const result = await controller.signInWithInvitation(req, 'link-abc')

      expect(service.signInWithInvitation).toHaveBeenCalledWith('link-abc')
      expect(result.resource.testId).toBe('test-1')
    })
  })
})

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService, UserEntity, UserService } from '@platon/core/server'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { CourseMemberService } from '@platon/feature/course/server'
import { UnauthorizedResponse } from '@platon/core/common'
import { Optional } from 'typescript-optional'
import { TestsCandidatesEntity } from './tests-candidates.entity'
import { TestsCandidatesService } from './tests-candidates.service'

describe('TestsCandidatesService', () => {
  let service: TestsCandidatesService
  let repository: MockRepository<TestsCandidatesEntity>
  let authService: jest.Mocked<Pick<AuthService, 'authenticate'>>
  let userService: jest.Mocked<Pick<UserService, 'findByIdOrName'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'getCoursesByMemberId'>>

  beforeEach(async () => {
    repository = mockRepository<TestsCandidatesEntity>()
    authService = { authenticate: jest.fn() }
    userService = { findByIdOrName: jest.fn() }
    courseMemberService = { getCoursesByMemberId: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        TestsCandidatesService,
        { provide: getRepositoryToken(TestsCandidatesEntity), useValue: repository },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: CourseMemberService, useValue: courseMemberService },
      ],
    }).compile()

    service = module.get(TestsCandidatesService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createMany', () => {
    it('devrait générer un linkId unique pour chaque candidat et sauvegarder', async () => {
      const inputs = [
        { userId: 'user-1', courseMemberId: 'member-1' },
        { userId: 'user-2', courseMemberId: 'member-2' },
      ]
      repository.save.mockImplementation(async (entities) => entities as never)

      const result = await service.createMany(inputs)

      expect(repository.save).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'user-1', courseMemberId: 'member-1', linkId: expect.any(String) }),
        expect.objectContaining({ userId: 'user-2', courseMemberId: 'member-2', linkId: expect.any(String) }),
      ])
      const saved = (result as unknown as { linkId: string }[]).map((c) => c.linkId)
      expect(saved[0]).not.toBe(saved[1])
      expect(saved[0].length).toBeGreaterThan(0)
    })
  })

  describe('signInWithInvitation', () => {
    it("devrait rejeter avec UnauthorizedResponse si l'id d'invitation est inconnu", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.signInWithInvitation('unknown-link')).rejects.toBeInstanceOf(UnauthorizedResponse)
      expect(repository.findOne).toHaveBeenCalledWith({ where: { linkId: 'unknown-link' } })
    })

    it("devrait rejeter avec UnauthorizedResponse si l'utilisateur associé n'existe plus", async () => {
      repository.findOne.mockResolvedValue({
        id: 'candidate-1',
        userId: 'user-1',
        courseMemberId: 'member-1',
      } as TestsCandidatesEntity)
      userService.findByIdOrName.mockResolvedValue(Optional.empty())

      await expect(service.signInWithInvitation('link-abc')).rejects.toBeInstanceOf(UnauthorizedResponse)
    })

    it('devrait authentifier le candidat et retourner le token et le testId associés', async () => {
      repository.findOne.mockResolvedValue({
        id: 'candidate-1',
        userId: 'user-1',
        courseMemberId: 'member-1',
      } as TestsCandidatesEntity)
      const user = { id: 'user-1', username: 'candidate' } as UserEntity
      userService.findByIdOrName.mockResolvedValue(Optional.of(user))
      authService.authenticate.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
      courseMemberService.getCoursesByMemberId.mockResolvedValue(['test-1', 'test-2'])

      const result = await service.signInWithInvitation('link-abc')

      expect(authService.authenticate).toHaveBeenCalledWith('user-1', 'candidate')
      expect(courseMemberService.getCoursesByMemberId).toHaveBeenCalledWith('member-1')
      expect(result).toEqual({ authToken: { accessToken: 'a', refreshToken: 'r' }, testId: 'test-1' })
    })
  })

  describe('searchByUsersIds', () => {
    it("devrait chercher les candidats par liste d'utilisateurs avec leur relation user", async () => {
      repository.find.mockResolvedValue([])

      await service.searchByUsersIds(['user-1', 'user-2'])

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: expect.anything() },
        relations: ['user'],
      })
    })
  })
})

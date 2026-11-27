import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserEntity } from '@platon/core/server'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { defaultMailContent, defaultTerms } from '@platon/feature/tests/common'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { ActivityService, CourseMemberService, CourseService } from '@platon/feature/course/server'
import { EmailService } from '@platon/feature/email/server'
import { EditorjsViewerService } from '@platon/shared/utils'
import { Optional } from 'typescript-optional'
import { TestEntity } from './test.entity'
import { TestService } from './test.service'
import { TestsCandidatesService } from './tests-candidates/tests-candidates.service'
import { TestsCandidatesEntity } from './tests-candidates/tests-candidates.entity'

describe('TestService', () => {
  let service: TestService
  let repository: MockRepository<TestEntity>
  let emailService: jest.Mocked<Pick<EmailService, 'send'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'search' | 'findById'>>
  let testsCandidatesService: jest.Mocked<Pick<TestsCandidatesService, 'searchByUsersIds'>>
  let editorjsViewerService: jest.Mocked<Pick<EditorjsViewerService, 'editorJStoHtml'>>
  let courseService: jest.Mocked<Pick<CourseService, 'findById'>>
  let activityService: jest.Mocked<Pick<ActivityService, 'search'>>

  const buildUser = (overrides: Partial<UserEntity> = {}) =>
    ({ id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.local', ...overrides } as UserEntity)

  beforeEach(async () => {
    repository = mockRepository<TestEntity>()
    emailService = { send: jest.fn().mockResolvedValue(true) }
    courseMemberService = { search: jest.fn(), findById: jest.fn() }
    testsCandidatesService = { searchByUsersIds: jest.fn() }
    editorjsViewerService = { editorJStoHtml: jest.fn().mockReturnValue('<p>html</p>') }
    courseService = { findById: jest.fn() }
    activityService = { search: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        TestService,
        { provide: getRepositoryToken(TestEntity), useValue: repository },
        { provide: EmailService, useValue: emailService },
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: TestsCandidatesService, useValue: testsCandidatesService },
        { provide: EditorjsViewerService, useValue: editorjsViewerService },
        { provide: CourseService, useValue: courseService },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile()

    service = module.get(TestService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createTest', () => {
    it('devrait créer un test avec les valeurs par défaut', async () => {
      const created = { id: 'test-1', courseId: 'course-1' } as TestEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.createTest({ courseId: 'course-1' })

      expect(repository.create).toHaveBeenCalledWith({
        courseId: 'course-1',
        terms: defaultTerms,
        mailContent: defaultMailContent,
        mailSubject: 'Invitation au test {{ testName }}',
      })
      expect(repository.save).toHaveBeenCalledWith(created)
      expect(result).toBe(created)
    })
  })

  describe('getTestByCourseId', () => {
    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.getTestByCourseId('course-1')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { courseId: 'course-1' } })
      expect(result.isEmpty()).toBe(true)
    })

    it('devrait retourner le test trouvé', async () => {
      const test = { id: 'test-1' } as TestEntity
      repository.findOne.mockResolvedValue(test)

      const result = await service.getTestByCourseId('course-1')

      expect(result.get()).toBe(test)
    })
  })

  describe('getCompletedTestTerms', () => {
    it("devrait lever une erreur si le test n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.getCompletedTestTerms('course-1', buildUser())).rejects.toThrow(
        'Test not found for ID: course-1'
      )
    })

    it('devrait interpoler les termes avec les variables du cours/activité/utilisateur', async () => {
      const test = { terms: { blocks: [{ type: 'paragraph', data: { text: 'Bonjour {{ firstName }}' } }] } }
      repository.findOne.mockResolvedValue(test as never)
      courseService.findById.mockResolvedValue(Optional.of({ name: 'Mon cours' } as never))
      activityService.search.mockResolvedValue([
        [{ openAt: null, closeAt: null, source: { variables: { settings: {} } } }],
        1,
      ] as never)

      const result = await service.getCompletedTestTerms('course-1', buildUser({ firstName: 'Alice' }))

      expect(result.blocks[0].data.text).toBe('Bonjour Alice')
    })

    it("devrait lever une NotFoundException si aucune activité n'est définie", async () => {
      const test = { terms: {} }
      repository.findOne.mockResolvedValue(test as never)
      courseService.findById.mockResolvedValue(Optional.of({ name: 'Mon cours' } as never))
      activityService.search.mockResolvedValue([[], 0] as never)

      await expect(service.getCompletedTestTerms('course-1', buildUser())).rejects.toThrow(
        'Une activité doit être définie pour envoyer le mail.'
      )
    })
  })

  describe('updateTestTerms', () => {
    it('devrait mettre à jour les termes du test', async () => {
      await service.updateTestTerms('test-1', { blocks: [] } as never)

      expect(repository.update).toHaveBeenCalledWith('test-1', { terms: { blocks: [] } })
    })
  })

  describe('updateTestMailContent', () => {
    it('devrait mettre à jour le contenu et le sujet du mail', async () => {
      await service.updateTestMailContent('test-1', { blocks: [] } as never, 'Subject')

      expect(repository.update).toHaveBeenCalledWith('test-1', { mailContent: { blocks: [] }, mailSubject: 'Subject' })
    })
  })

  describe('sendAllMails', () => {
    it('devrait envoyer un mail à chaque membre étudiant du test', async () => {
      courseMemberService.search.mockResolvedValue([[{ id: 'member-1' }, { id: 'member-2' }] as never, 2] as never)
      const sendSpy = jest.spyOn(service, 'sendMailToCandidate').mockResolvedValue(undefined)

      await service.sendAllMails('test-1', 'https://platon.test', buildUser())

      expect(courseMemberService.search).toHaveBeenCalledWith('test-1', { roles: [CourseMemberRoles.student] })
      expect(sendSpy).toHaveBeenCalledTimes(2)
      expect(sendSpy).toHaveBeenCalledWith('test-1', 'member-1', 'https://platon.test', expect.anything())
      expect(sendSpy).toHaveBeenCalledWith('test-1', 'member-2', 'https://platon.test', expect.anything())
    })

    it("ne devrait pas interrompre l'envoi si un membre échoue", async () => {
      courseMemberService.search.mockResolvedValue([[{ id: 'member-1' }, { id: 'member-2' }] as never, 2] as never)
      const sendSpy = jest
        .spyOn(service, 'sendMailToCandidate')
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined)

      await expect(service.sendAllMails('test-1', 'https://platon.test', buildUser())).resolves.toBeUndefined()
      expect(sendSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('sendMailToCandidate', () => {
    const candidate = {
      id: 'candidate-1',
      linkId: 'link-abc',
      user: buildUser({ email: 'candidate@test.local' }),
    } as TestsCandidatesEntity

    const setupHappyPath = () => {
      courseMemberService.findById.mockResolvedValue(Optional.of({ userId: 'user-1' } as never))
      testsCandidatesService.searchByUsersIds.mockResolvedValue([candidate])
      courseService.findById.mockResolvedValue(Optional.of({ name: 'Mon cours' } as never))
      activityService.search.mockResolvedValue([
        [{ openAt: null, closeAt: null, source: { variables: { settings: {} } } }],
        1,
      ] as never)
      repository.findOne.mockResolvedValue({
        mailContent: { blocks: [] },
        mailSubject: 'Invitation {{ testName }}',
      } as never)
    }

    it("devrait lever une erreur si le membre du cours n'existe pas", async () => {
      courseMemberService.findById.mockResolvedValue(Optional.empty())

      await expect(service.sendMailToCandidate('test-1', 'member-1', 'https://x.com', buildUser())).rejects.toThrow(
        'Test member not found for course member ID: member-1'
      )
    })

    it("devrait lever une erreur si le candidat n'a pas d'email", async () => {
      courseMemberService.findById.mockResolvedValue(Optional.of({ userId: 'user-1' } as never))
      testsCandidatesService.searchByUsersIds.mockResolvedValue([{ ...candidate, user: undefined } as never])

      await expect(service.sendMailToCandidate('test-1', 'member-1', 'https://x.com', buildUser())).rejects.toThrow(
        /User not found or email not available/
      )
    })

    it("devrait lever une erreur si le test n'existe pas", async () => {
      courseMemberService.findById.mockResolvedValue(Optional.of({ userId: 'user-1' } as never))
      testsCandidatesService.searchByUsersIds.mockResolvedValue([candidate])
      courseService.findById.mockResolvedValue(Optional.of({ name: 'Mon cours' } as never))
      activityService.search.mockResolvedValue([
        [{ openAt: null, closeAt: null, source: { variables: { settings: {} } } }],
        1,
      ] as never)
      repository.findOne.mockResolvedValue(null)

      await expect(service.sendMailToCandidate('test-1', 'member-1', 'https://x.com', buildUser())).rejects.toThrow(
        'Test not found for course ID: test-1'
      )
    })

    it('devrait lever une erreur si le contenu ou le sujet du mail ne sont pas définis', async () => {
      courseMemberService.findById.mockResolvedValue(Optional.of({ userId: 'user-1' } as never))
      testsCandidatesService.searchByUsersIds.mockResolvedValue([candidate])
      courseService.findById.mockResolvedValue(Optional.of({ name: 'Mon cours' } as never))
      activityService.search.mockResolvedValue([
        [{ openAt: null, closeAt: null, source: { variables: { settings: {} } } }],
        1,
      ] as never)
      repository.findOne.mockResolvedValue({ mailContent: null, mailSubject: '' } as never)

      await expect(service.sendMailToCandidate('test-1', 'member-1', 'https://x.com', buildUser())).rejects.toThrow(
        'Mail content or subject not set for test ID: test-1'
      )
    })

    it("devrait envoyer le mail avec le lien d'invitation et les variables interpolées", async () => {
      setupHappyPath()
      const currentUser = buildUser({ id: 'teacher-1', firstName: 'Teach', lastName: 'Er', email: 'teach@test.local' })

      await service.sendMailToCandidate('test-1', 'member-1', 'https://platon.test', currentUser)

      expect(emailService.send).toHaveBeenCalledWith({
        to: 'candidate@test.local',
        subject: 'Invitation Mon cours',
        html: '<p>html</p>',
      })
    })
  })
})

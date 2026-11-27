import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService } from '@platon/core/server'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { CourseMemberService } from '../course-member/course-member.service'
import { CourseEntity } from '../entites/course.entity'
import { CourseDemoEntity } from './course-demo.entity'
import { CourseDemoService } from './course-demo.service'

describe('CourseDemoService', () => {
  let service: CourseDemoService
  let repository: MockRepository<CourseDemoEntity>
  let authService: jest.Mocked<Pick<AuthService, 'signInDemo'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'addUser'>>

  beforeEach(async () => {
    repository = mockRepository<CourseDemoEntity>()
    authService = { signInDemo: jest.fn() }
    courseMemberService = { addUser: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        CourseDemoService,
        { provide: AuthService, useValue: authService },
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: getRepositoryToken(CourseDemoEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(CourseDemoService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('devrait créer un demo lié au cours', async () => {
      const course = { id: 'course-1' } as CourseEntity
      const demo = { id: 'demo-1', course } as CourseDemoEntity
      repository.create.mockReturnValue(demo)
      repository.save.mockResolvedValue(demo)

      await expect(service.create(course)).resolves.toBe(demo)
      expect(repository.create).toHaveBeenCalledWith({ course })
    })
  })

  describe('findByCourseId', () => {
    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect((await service.findByCourseId('course-1')).isEmpty()).toBe(true)
    })
  })

  describe('findByUri', () => {
    it('devrait chercher par id (uri)', async () => {
      repository.findOne.mockResolvedValue(null)

      await service.findByUri('demo-uri')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'demo-uri' }, relations: { course: true } })
    })
  })

  describe('registerToDemo', () => {
    it("devrait connecter un utilisateur anonyme et l'ajouter comme étudiant", async () => {
      const demo = { course: { id: 'course-1' } } as CourseDemoEntity
      authService.signInDemo.mockResolvedValue({
        authToken: { accessToken: 'a', refreshToken: 'r' },
        userId: 'u1',
      } as never)

      const token = await service.registerToDemo(demo)

      expect(courseMemberService.addUser).toHaveBeenCalledWith('course-1', 'u1', CourseMemberRoles.student)
      expect(token).toEqual({ accessToken: 'a', refreshToken: 'r' })
    })
  })

  describe('delete', () => {
    it('devrait supprimer le demo lié au cours', async () => {
      await service.delete('course-1')

      expect(repository.delete).toHaveBeenCalledWith({ course: { id: 'course-1' } })
    })
  })
})

import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { ForbiddenResponse, NotFoundResponse, UserRoles } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { Optional } from 'typescript-optional'
import { CourseMemberService } from '../course-member/course-member.service'
import { CourseEntity } from '../entites/course.entity'
import { CourseService } from '../services/course.service'
import { CourseDemoController } from './course-demo.controller'
import { CourseDemoEntity } from './course-demo.entity'
import { CourseDemoService } from './course-demo.service'

describe('CourseDemoController', () => {
  let controller: CourseDemoController
  let demoService: jest.Mocked<
    Pick<CourseDemoService, 'findByUri' | 'findByCourseId' | 'registerToDemo' | 'create' | 'delete'>
  >
  let courseService: jest.Mocked<Pick<CourseService, 'findById'>>
  let courseMemberService: jest.Mocked<Pick<CourseMemberService, 'isMember' | 'addUser' | 'hasWritePermission'>>

  beforeEach(async () => {
    demoService = {
      findByUri: jest.fn(),
      findByCourseId: jest.fn(),
      registerToDemo: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    }
    courseService = { findById: jest.fn() }
    courseMemberService = { isMember: jest.fn(), addUser: jest.fn(), hasWritePermission: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        CourseDemoController,
        { provide: CourseDemoService, useValue: demoService },
        { provide: CourseService, useValue: courseService },
        { provide: CourseMemberService, useValue: courseMemberService },
      ],
    }).compile()

    controller = module.get(CourseDemoController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('accessDemo', () => {
    it("devrait lever une NotFoundResponse si le demo n'existe pas", async () => {
      demoService.findByUri.mockResolvedValue(Optional.empty())

      await expect(controller.accessDemo({ uri: 'demo-uri' }, { user: undefined } as never)).rejects.toBeInstanceOf(
        NotFoundResponse
      )
    })

    it("devrait ajouter l'utilisateur connecté comme membre s'il ne l'est pas déjà", async () => {
      const demo = { id: 'demo-1', course: { id: 'course-1' } } as CourseDemoEntity
      demoService.findByUri.mockResolvedValue(Optional.of(demo))
      courseMemberService.isMember.mockResolvedValue(false)
      const req = { user: { id: 'user-1' } } as IRequest

      const result = await controller.accessDemo({ uri: 'demo-uri' }, req)

      expect(courseMemberService.addUser).toHaveBeenCalled()
      expect(result.resource.auth).toBe(false)
      expect(demoService.registerToDemo).not.toHaveBeenCalled()
    })

    it('ne devrait pas ré-ajouter un utilisateur déjà membre', async () => {
      const demo = { id: 'demo-1', course: { id: 'course-1' } } as CourseDemoEntity
      demoService.findByUri.mockResolvedValue(Optional.of(demo))
      courseMemberService.isMember.mockResolvedValue(true)
      const req = { user: { id: 'user-1' } } as IRequest

      await controller.accessDemo({ uri: 'demo-uri' }, req)

      expect(courseMemberService.addUser).not.toHaveBeenCalled()
    })

    it('devrait connecter anonymement un visiteur non authentifié', async () => {
      const demo = { id: 'demo-1', course: { id: 'course-1' } } as CourseDemoEntity
      demoService.findByUri.mockResolvedValue(Optional.of(demo))
      demoService.registerToDemo.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
      const req = { user: undefined } as unknown as IRequest

      const result = await controller.accessDemo({ uri: 'demo-uri' }, req)

      expect(result.resource.auth).toBe(true)
      expect(result.resource.accessToken).toBe('a')
    })
  })

  describe('getDemo', () => {
    it("devrait retourner demoExists=false si aucun demo n'existe", async () => {
      demoService.findByCourseId.mockResolvedValue(Optional.empty())

      const result = await controller.getDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })

      expect(result.resource.demoExists).toBe(false)
    })

    it("devrait lever une ForbiddenResponse si l'utilisateur n'est pas membre et pas admin", async () => {
      demoService.findByCourseId.mockResolvedValue(Optional.of({ id: 'demo-1', course: { id: 'course-1' } } as never))
      courseMemberService.isMember.mockResolvedValue(false)

      await expect(
        controller.getDemo({ user: { id: 'u1', role: UserRoles.student } } as IRequest, { courseId: 'course-1' })
      ).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('devrait retourner le demo pour un admin même non membre', async () => {
      demoService.findByCourseId.mockResolvedValue(Optional.of({ id: 'demo-uri', course: { id: 'course-1' } } as never))
      courseMemberService.isMember.mockResolvedValue(false)

      const result = await controller.getDemo({ user: { id: 'u1', role: UserRoles.admin } } as IRequest, {
        courseId: 'course-1',
      })

      expect(result.resource.demoExists).toBe(true)
    })
  })

  describe('createDemo', () => {
    it("devrait lever une NotFoundResponse si le cours n'existe pas", async () => {
      courseService.findById.mockResolvedValue(Optional.empty())

      await expect(
        controller.createDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })
      ).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait lever une ForbiddenResponse sans permission d'écriture", async () => {
      courseService.findById.mockResolvedValue(Optional.of({ id: 'course-1' } as CourseEntity))
      courseMemberService.hasWritePermission.mockResolvedValue(false)

      await expect(
        controller.createDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })
      ).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('devrait lever une BadRequestException si un demo existe déjà', async () => {
      courseService.findById.mockResolvedValue(Optional.of({ id: 'course-1' } as CourseEntity))
      courseMemberService.hasWritePermission.mockResolvedValue(true)
      demoService.findByCourseId.mockResolvedValue(Optional.of({} as CourseDemoEntity))

      await expect(
        controller.createDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('devrait créer le demo', async () => {
      courseService.findById.mockResolvedValue(Optional.of({ id: 'course-1' } as CourseEntity))
      courseMemberService.hasWritePermission.mockResolvedValue(true)
      demoService.findByCourseId.mockResolvedValue(Optional.empty())
      demoService.create.mockResolvedValue({ id: 'demo-1', course: { id: 'course-1' } } as CourseDemoEntity)

      const result = await controller.createDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })

      expect(result.resource.uri).toBe('demo-1')
    })
  })

  describe('deleteDemo', () => {
    it("devrait lever une ForbiddenResponse sans permission d'écriture", async () => {
      courseMemberService.hasWritePermission.mockResolvedValue(false)

      await expect(
        controller.deleteDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })
      ).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it("devrait lever une BadRequestException si aucun demo n'existe", async () => {
      courseMemberService.hasWritePermission.mockResolvedValue(true)
      demoService.findByCourseId.mockResolvedValue(Optional.empty())

      await expect(
        controller.deleteDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('devrait supprimer le demo', async () => {
      courseMemberService.hasWritePermission.mockResolvedValue(true)
      demoService.findByCourseId.mockResolvedValue(Optional.of({} as CourseDemoEntity))

      await controller.deleteDemo({ user: { id: 'u1' } } as IRequest, { courseId: 'course-1' })

      expect(demoService.delete).toHaveBeenCalledWith('course-1')
    })
  })
})

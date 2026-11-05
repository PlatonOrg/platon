import { Test } from '@nestjs/testing'
import { NotFoundResponse, User } from '@platon/core/common'
import { Optional } from 'typescript-optional'
import { CourseSectionController } from './section.controller'
import { CourseSectionEntity } from './section.entity'
import { CourseSectionService } from './section.service'
import { IRequest } from '@platon/core/server'

describe('CourseSectionController', () => {
  let controller: CourseSectionController
  let service: jest.Mocked<Pick<CourseSectionService, 'findById' | 'ofCourse' | 'create' | 'update' | 'delete'>>

  beforeEach(async () => {
    service = {
      findById: jest.fn(),
      ofCourse: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [CourseSectionController, { provide: CourseSectionService, useValue: service }],
    }).compile()

    controller = module.get(CourseSectionController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('find', () => {
    it("devrait lever une NotFoundResponse si la section n'existe pas", async () => {
      service.findById.mockResolvedValue(Optional.empty())
      const mockReq = {} as IRequest

      await expect(controller.find(mockReq, 'course-1', 'section-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait retourner la section trouvée', async () => {
      service.findById.mockResolvedValue(Optional.of({ id: 'section-1' } as CourseSectionEntity))
      const mockReq = {} as IRequest

      const result = await controller.find(mockReq, 'course-1', 'section-1')

      expect(result.resource.id).toBe('section-1')
    })

    it("ne devrait pas lever d'exception pour un utilisateur non défini", async () => {
      service.findById.mockResolvedValue(Optional.of({ id: 'section-1' } as CourseSectionEntity))

      await expect(controller.find({} as IRequest, 'course-1', 'section-1')).resolves.toBeDefined()
      expect(service.findById).toHaveBeenCalledWith('course-1', 'section-1', undefined)
    })

    it('devrait renvoyer une 404 quand le service masque une section cachée', async () => {
      service.findById.mockResolvedValue(Optional.empty())

      await expect(
        controller.find({ user: { id: 'student' } } as IRequest, 'course-1', 'hidden-1')
      ).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('list', () => {
    it('devrait retourner la liste mappée des sections', async () => {
      const mockReq = {} as IRequest
      service.ofCourse.mockResolvedValue([[{ id: 's1' } as CourseSectionEntity], 1])

      const result = await controller.list(mockReq, 'course-1')

      expect(result.total).toBe(1)
      expect(result.resources).toHaveLength(1)
    })

    it("devrait transmettre l'utilisateur de la requête au service", async () => {
      const user = { id: 'user-1' } as User
      service.ofCourse.mockResolvedValue([[], 0])

      await controller.list({ user } as IRequest, 'course-1')

      expect(service.ofCourse).toHaveBeenCalledWith('course-1', user)
    })
  })

  describe('create', () => {
    it('devrait créer la section avec le courseId injecté', async () => {
      service.create.mockResolvedValue({ id: 'section-1' } as CourseSectionEntity)

      await controller.create('course-1', { name: 'Section', order: 0 } as never)

      expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course-1', name: 'Section' }))
    })
  })

  describe('update', () => {
    it('devrait déléguer au service', async () => {
      service.update.mockResolvedValue({ id: 'section-1', name: 'New' } as CourseSectionEntity)

      const result = await controller.update('course-1', 'section-1', { name: 'New' })

      expect(service.update).toHaveBeenCalledWith('course-1', 'section-1', { name: 'New' })
      expect(result.resource.name).toBe('New')
    })
  })

  describe('delete', () => {
    it('devrait supprimer la section', async () => {
      await controller.delete('course-1', 'section-1')

      expect(service.delete).toHaveBeenCalledWith('course-1', 'section-1')
    })
  })
})

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { DataSource } from 'typeorm'
import { CourseSectionEntity } from './section.entity'
import { CourseSectionService } from './section.service'

describe('CourseSectionService', () => {
  let service: CourseSectionService
  let repository: MockRepository<CourseSectionEntity>
  let dataSource: { transaction: jest.Mock }

  beforeEach(async () => {
    repository = mockRepository<CourseSectionEntity>()
    dataSource = { transaction: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        CourseSectionService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(CourseSectionEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(CourseSectionService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect((await service.findById('course-1', 'section-1')).isEmpty()).toBe(true)
    })
  })

  describe('ofCourse', () => {
    it('devrait retourner les sections triées par ordre ascendant', async () => {
      repository.findAndCount.mockResolvedValue([[], 0])

      await service.ofCourse('course-1')

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        order: { order: { direction: 'ASC' } },
      })
    })
  })

  describe('create', () => {
    it('devrait décaler les sections existantes avec un ordre >= et créer la nouvelle', async () => {
      const existing = [
        { id: 's1', order: 1 },
        { id: 's2', order: 2 },
      ] as CourseSectionEntity[]
      const manager = {
        find: jest.fn().mockResolvedValue(existing),
        save: jest.fn(),
        create: jest.fn((entity, data) => data),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.create({ courseId: 'course-1', name: 'New section', order: 1 } as CourseSectionEntity)

      expect(manager.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 's1', order: 2 }),
        expect.objectContaining({ id: 's2', order: 3 }),
      ])
    })
  })

  describe('update', () => {
    it("devrait lever une NotFoundResponse si la section n'existe pas", async () => {
      const manager = { findOne: jest.fn().mockResolvedValue(null) }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await expect(service.update('course-1', 'section-1', { name: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("ne devrait pas réordonner si l'ordre ne change pas", async () => {
      const section = { id: 'section-1', order: 1 } as CourseSectionEntity
      const manager = { findOne: jest.fn().mockResolvedValue(section), find: jest.fn(), save: jest.fn((s) => s) }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('course-1', 'section-1', { name: 'New name' })

      expect(manager.find).not.toHaveBeenCalled()
    })

    it("devrait décrémenter les sections entre l'ancien et le nouvel ordre quand on avance la section", async () => {
      const section = { id: 'section-1', order: 1 } as CourseSectionEntity
      const between = [
        { id: 's2', order: 2 },
        { id: 's3', order: 3 },
      ] as CourseSectionEntity[]
      const manager = {
        findOne: jest.fn().mockResolvedValue(section),
        find: jest.fn().mockResolvedValue(between),
        save: jest.fn((s) => s),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('course-1', 'section-1', { order: 3 })

      expect(manager.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 's2', order: 1 }),
        expect.objectContaining({ id: 's3', order: 2 }),
      ])
    })

    it("devrait incrémenter les sections entre le nouvel et l'ancien ordre quand on recule la section", async () => {
      const section = { id: 'section-1', order: 3 } as CourseSectionEntity
      const between = [
        { id: 's1', order: 1 },
        { id: 's2', order: 2 },
      ] as CourseSectionEntity[]
      const manager = {
        findOne: jest.fn().mockResolvedValue(section),
        find: jest.fn().mockResolvedValue(between),
        save: jest.fn((s) => s),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('course-1', 'section-1', { order: 1 })

      expect(manager.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 's1', order: 2 }),
        expect.objectContaining({ id: 's2', order: 3 }),
      ])
    })
  })

  describe('delete', () => {
    it("devrait lever une NotFoundResponse si la section n'existe pas", async () => {
      const manager = { findOne: jest.fn().mockResolvedValue(null) }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await expect(service.delete('course-1', 'section-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait réindexer les sections restantes puis supprimer la section', async () => {
      const section = { id: 'section-1', order: 1 } as CourseSectionEntity
      const others = [
        { id: 's2', order: 0 },
        { id: 's3', order: 2 },
      ] as CourseSectionEntity[]
      const manager = {
        findOne: jest.fn().mockResolvedValue(section),
        find: jest.fn().mockResolvedValue(others),
        save: jest.fn(),
        remove: jest.fn().mockResolvedValue(section),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.delete('course-1', 'section-1')

      expect(manager.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 's2', order: 0 }),
        expect.objectContaining({ id: 's3', order: 1 }),
      ])
      expect(manager.remove).toHaveBeenCalledWith(section)
    })

    it("ne devrait pas sauvegarder si aucune autre section n'existe", async () => {
      const section = { id: 'section-1', order: 0 } as CourseSectionEntity
      const manager = {
        findOne: jest.fn().mockResolvedValue(section),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
        remove: jest.fn().mockResolvedValue(section),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.delete('course-1', 'section-1')

      expect(manager.save).not.toHaveBeenCalled()
    })
  })
})

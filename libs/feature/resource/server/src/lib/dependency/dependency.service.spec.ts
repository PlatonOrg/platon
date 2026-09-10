import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { LATEST } from '@platon/feature/resource/common'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { EntityManager } from 'typeorm'
import { ResourceDependencyEntity } from './dependency.entity'
import { ResourceDependencyService } from './dependency.service'

describe('ResourceDependencyService', () => {
  let service: ResourceDependencyService
  let repository: MockRepository<ResourceDependencyEntity>

  const buildInput = (overrides: Record<string, unknown> = {}) => ({
    resourceId: 'resource-1',
    dependOnId: 'depend-1',
    resourceVersion: 'v1',
    dependOnVersion: 'v1',
    isTemplate: false,
    ...overrides,
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceDependencyService,
        { provide: getRepositoryToken(ResourceDependencyEntity), useValue: mockRepository<ResourceDependencyEntity>() },
      ],
    }).compile()

    service = module.get(ResourceDependencyService)
    repository = module.get(getRepositoryToken(ResourceDependencyEntity))
  })

  describe('upsert', () => {
    it('devrait créer une nouvelle dépendance si aucune existante', async () => {
      repository.findOne.mockResolvedValue(null)
      const created = { resourceId: 'resource-1', dependOnId: 'depend-1' } as ResourceDependencyEntity
      repository.create.mockReturnValue(created)
      repository.save.mockImplementation(async (d) => d as ResourceDependencyEntity)

      const input = buildInput()
      const result = await service.upsert(input)

      expect(repository.create).toHaveBeenCalledWith(input)
      expect(result.resourceVersion).toBe('v1')
    })

    it('devrait mettre à jour la dépendance existante plutôt que de la recréer', async () => {
      const existing = {
        resourceId: 'resource-1',
        dependOnId: 'depend-1',
        resourceVersion: 'old',
      } as ResourceDependencyEntity
      repository.findOne.mockResolvedValue(existing)
      repository.save.mockImplementation(async (d) => d as ResourceDependencyEntity)

      const result = await service.upsert(buildInput({ resourceVersion: 'v2' }))

      expect(repository.create).not.toHaveBeenCalled()
      expect(result.resourceVersion).toBe('v2')
    })

    it("devrait utiliser l'EntityManager fourni plutôt que le repository", async () => {
      const entityManager = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation(async (_entity, d) => d),
      } as unknown as EntityManager
      // create() n'a pas besoin de l'EntityManager (ne touche pas la DB), le service l'appelle toujours sur le repository
      repository.create.mockReturnValue({} as ResourceDependencyEntity)

      await service.upsert(buildInput(), entityManager)

      expect(entityManager.findOne).toHaveBeenCalled()
      expect(entityManager.save).toHaveBeenCalled()
      expect(repository.findOne).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('updateTemplateDependency', () => {
    it('devrait forcer isTemplate=true', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockReturnValue({} as ResourceDependencyEntity)
      repository.save.mockImplementation(async (d) => d as ResourceDependencyEntity)

      const result = await service.updateTemplateDependency(buildInput({ isTemplate: false }))

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { resourceId: 'resource-1', resourceVersion: 'v1', isTemplate: true },
      })
      expect(result.isTemplate).toBe(true)
    })
  })

  describe('createDependencyForNewVersion', () => {
    it("devrait lever une erreur si aucune dépendance LATEST n'existe", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.createDependencyForNewVersion('resource-1', 'v2')).rejects.toThrow()
    })

    it('devrait retourner directement la dépendance LATEST si la version demandée est LATEST', async () => {
      const latest = { resourceId: 'resource-1', resourceVersion: LATEST } as ResourceDependencyEntity
      repository.findOne.mockResolvedValue(latest)

      const result = await service.createDependencyForNewVersion('resource-1', LATEST)

      expect(repository.create).not.toHaveBeenCalled()
      expect(result).toBe(latest)
    })

    it('devrait créer une nouvelle dépendance copiant la cible de la version LATEST', async () => {
      const latest = {
        resourceId: 'resource-1',
        dependOnId: 'depend-1',
        dependOnVersion: 'v1',
      } as ResourceDependencyEntity
      repository.findOne.mockResolvedValue(latest)
      const created = { resourceId: 'resource-1', resourceVersion: 'v2' } as ResourceDependencyEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.createDependencyForNewVersion('resource-1', 'v2')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceVersion: 'v2', dependOnId: 'depend-1', dependOnVersion: 'v1' })
      )
      expect(result).toBe(created)
    })
  })

  describe('deleteDependencyForVersion', () => {
    it('devrait supprimer par resourceId et resourceVersion', async () => {
      await service.deleteDependencyForVersion('resource-1', 'v1')

      expect(repository.delete).toHaveBeenCalledWith({ resourceId: 'resource-1', resourceVersion: 'v1' })
    })
  })

  describe('delete', () => {
    it('devrait supprimer via le repository sans EntityManager', async () => {
      await service.delete('resource-1', 'depend-1')

      expect(repository.delete).toHaveBeenCalledWith({ resourceId: 'resource-1', dependOnId: 'depend-1' })
    })

    it("devrait supprimer via l'EntityManager fourni", async () => {
      const entityManager = { delete: jest.fn() } as unknown as EntityManager

      await service.delete('resource-1', 'depend-1', entityManager)

      expect(entityManager.delete).toHaveBeenCalledWith(ResourceDependencyEntity, {
        resourceId: 'resource-1',
        dependOnId: 'depend-1',
      })
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })

  describe('fromActivity', () => {
    it('devrait supprimer les dépendances absentes des groupes fournis et créer les nouvelles', async () => {
      const obsolete = {
        resourceId: 'act-1',
        dependOnId: 'old-exercise',
        resourceVersion: 'v1',
      } as ResourceDependencyEntity
      repository.find.mockResolvedValue([obsolete])
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((d) => d as ResourceDependencyEntity)
      repository.save.mockImplementation(async (d) => d as ResourceDependencyEntity)

      const result = await service.fromActivity({
        id: 'act-1',
        version: 'v1',
        exerciseGroups: {
          group1: { exercises: [{ resource: 'new-exercise', version: 'v1' }] },
        } as never,
      })

      expect(repository.delete).toHaveBeenCalledWith({ resourceId: 'act-1', dependOnId: 'old-exercise' })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ resourceId: 'act-1', dependOnId: 'new-exercise' })
    })

    it('ne devrait ni supprimer ni recréer une dépendance déjà présente dans les deux ensembles', async () => {
      const existing = {
        resourceId: 'act-1',
        dependOnId: 'exercise-1',
        resourceVersion: 'v1',
      } as ResourceDependencyEntity
      repository.find.mockResolvedValue([existing])

      const result = await service.fromActivity({
        id: 'act-1',
        version: 'v1',
        exerciseGroups: {
          group1: { exercises: [{ resource: 'exercise-1', version: 'v1' }] },
        } as never,
      })

      expect(repository.delete).not.toHaveBeenCalled()
      expect(result).toHaveLength(0)
    })
  })

  describe('listDependencies / listDependents / getTemplateDependency', () => {
    it('devrait lister les dépendances avec les relations resource/dependOn', async () => {
      repository.find.mockResolvedValue([])

      await service.listDependencies('resource-1')

      expect(repository.find).toHaveBeenCalledWith({
        where: { resourceId: 'resource-1' },
        relations: { resource: true, dependOn: true },
      })
    })

    it('devrait lister les dépendants avec les relations resource/dependOn', async () => {
      repository.find.mockResolvedValue([])

      await service.listDependents('depend-1')

      expect(repository.find).toHaveBeenCalledWith({
        where: { dependOnId: 'depend-1' },
        relations: { resource: true, dependOn: true },
      })
    })

    it('devrait retourner la dépendance de template correspondante', async () => {
      const dependency = { resourceId: 'resource-1' } as ResourceDependencyEntity
      repository.findOne.mockResolvedValue(dependency)

      const result = await service.getTemplateDependency('resource-1', 'v1')

      expect(result).toBe(dependency)
    })
  })
})

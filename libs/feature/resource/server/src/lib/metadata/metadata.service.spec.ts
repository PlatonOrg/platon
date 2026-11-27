import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { EntityManager } from 'typeorm'
import { ResourceDependencyService } from '../dependency'
import { ResourceFileService } from '../files/file.service'
import { ResourceEntity } from '../resource.entity'
import { ResourceMetaEntity } from './metadata.entity'
import { ResourceMetadataService } from './metadata.service'

describe('ResourceMetadataService', () => {
  let service: ResourceMetadataService
  let repository: MockRepository<ResourceMetaEntity>
  let fileService: jest.Mocked<ResourceFileService>
  let dependencyService: jest.Mocked<ResourceDependencyService>

  const buildResource = (overrides: Partial<ResourceEntity> = {}): ResourceEntity =>
    ({ id: 'resource-1', type: ResourceTypes.CIRCLE, ...overrides } as ResourceEntity)

  const buildRepo = (overrides: Record<string, unknown> = {}) => ({
    versions: jest.fn().mockResolvedValue({ all: [], latest: undefined }),
    read: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
    rename: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceMetadataService,
        { provide: getRepositoryToken(ResourceMetaEntity), useValue: mockRepository<ResourceMetaEntity>() },
        { provide: ResourceFileService, useValue: { repo: jest.fn() } },
        { provide: ResourceDependencyService, useValue: { fromActivity: jest.fn(), upsert: jest.fn() } },
      ],
    }).compile()

    service = module.get(ResourceMetadataService)
    repository = module.get(getRepositoryToken(ResourceMetaEntity))
    fileService = module.get(ResourceFileService)
    dependencyService = module.get(ResourceDependencyService)
  })

  describe('findByIds', () => {
    it('devrait indexer les métadonnées par resourceId', async () => {
      const metas = [{ resourceId: 'r1' }, { resourceId: 'r2' }] as ResourceMetaEntity[]
      repository.findBy.mockResolvedValue(metas)

      const result = await service.findByIds(['r1', 'r2'])

      expect(result.get('r1')).toBe(metas[0])
      expect(result.get('r2')).toBe(metas[1])
    })

    it('devrait retourner une map vide si la requête échoue', async () => {
      repository.findBy.mockRejectedValue(new Error('db error'))

      const result = await service.findByIds(['r1'])

      expect(result.size).toBe(0)
    })
  })

  describe('of', () => {
    it('devrait retourner les métadonnées existantes sans les recréer', async () => {
      const existing = { resourceId: 'resource-1' } as ResourceMetaEntity
      repository.findOne.mockResolvedValue(existing)

      const result = await service.of('resource-1')

      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(existing)
    })

    it("devrait créer les métadonnées si elles n'existent pas encore", async () => {
      repository.findOne.mockResolvedValue(null)
      const created = { resourceId: 'resource-1' } as ResourceMetaEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.of('resource-1')

      expect(repository.create).toHaveBeenCalledWith({ resourceId: 'resource-1' })
      expect(result).toBe(created)
    })

    it("devrait utiliser l'EntityManager fourni plutôt que le repository", async () => {
      const created = { resourceId: 'resource-1' } as ResourceMetaEntity
      const entityManager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(created),
        save: jest.fn().mockResolvedValue(created),
      } as unknown as EntityManager

      const result = await service.of('resource-1', entityManager)

      expect(repository.findOne).not.toHaveBeenCalled()
      expect(result).toBe(created)
    })
  })

  describe('syncCircle', () => {
    it('devrait synchroniser les versions du circle et sauvegarder', async () => {
      const resource = buildResource()
      const repo = buildRepo({ versions: jest.fn().mockResolvedValue({ all: [{ tag: 'v1' }] }) })
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      const result = await service.syncCircle({ resource, repo: repo as never })

      expect(fileService.repo).not.toHaveBeenCalled()
      expect(result.meta).toEqual({ versions: [{ tag: 'v1' }] })
    })

    it('devrait récupérer le repo via fileService si non fourni', async () => {
      const resource = buildResource()
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo } as never)
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      await service.syncCircle({ resource })

      expect(fileService.repo).toHaveBeenCalledWith(resource)
    })
  })

  describe('syncActivity', () => {
    it('devrait extraire les settings, synchroniser les dépendances et sauvegarder', async () => {
      const resource = buildResource({ type: ResourceTypes.ACTIVITY })
      const content = JSON.stringify({ settings: { navigation: { mode: 'linear' } }, exerciseGroups: {} })
      const repo = buildRepo({
        read: jest.fn().mockResolvedValue([{}, Promise.resolve({ buffer: Buffer.from(content) })]),
        versions: jest.fn().mockResolvedValue({ all: [{ tag: 'v1' }] }),
      })
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      const result = await service.syncActivity({ resource, repo: repo as never })

      expect(dependencyService.fromActivity).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'resource-1', exerciseGroups: {} })
      )
      expect((result.meta as never as { settings: unknown }).settings).toEqual({ navigation: { mode: 'linear' } })
    })
  })

  describe('syncExercise', () => {
    it('devrait renommer un ancien config.json', async () => {
      const resource = buildResource({ type: ResourceTypes.EXERCISE })
      const repo = buildRepo({ exists: jest.fn().mockResolvedValue(false) })
      repo.exists.mockImplementation((path: string) => Promise.resolve(path === 'config.json'))
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      await service.syncExercise({ resource, repo: repo as never })

      expect(repo.rename).toHaveBeenCalledWith('config.json', expect.any(String))
    })

    it('devrait marquer configurable=false si aucun fichier de config ple ne existe', async () => {
      const resource = buildResource({ type: ResourceTypes.EXERCISE })
      const repo = buildRepo({ exists: jest.fn().mockResolvedValue(false) })
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      const result = await service.syncExercise({ resource, repo: repo as never })

      expect((result.meta as never as { configurable: boolean }).configurable).toBe(false)
    })

    it('devrait lire la config existante et calculer configurable selon le nombre de champs', async () => {
      const resource = buildResource({ type: ResourceTypes.EXERCISE })
      const config = { inputs: [{ name: 'x' }] }
      const repo = buildRepo({
        exists: jest.fn().mockResolvedValue(true),
        read: jest.fn().mockResolvedValue([{}, Promise.resolve({ buffer: Buffer.from(JSON.stringify(config)) })]),
      })
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      const result = await service.syncExercise({ resource, repo: repo as never })

      expect((result.meta as never as { configurable: boolean }).configurable).toBe(true)
    })

    it('devrait utiliser le contenu du changement fourni plutôt que relire le fichier', async () => {
      const resource = buildResource({ type: ResourceTypes.EXERCISE })
      const repo = buildRepo({ exists: jest.fn().mockResolvedValue(true) })
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      await service.syncExercise({ resource, repo: repo as never }, {
        path: 'ple.config.json',
        newContent: JSON.stringify({ inputs: [] }),
      } as never)

      expect(repo.read).not.toHaveBeenCalled()
    })

    it('devrait upsert la dépendance de template si templateId est défini', async () => {
      const resource = buildResource({ type: ResourceTypes.EXERCISE, templateId: 'template-1' } as never)
      const repo = buildRepo()
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockImplementation(async (m) => m as ResourceMetaEntity)

      await service.syncExercise({ resource, repo: repo as never })

      expect(dependencyService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'resource-1', dependOnId: 'template-1', isTemplate: true })
      )
    })
  })

  describe('onReleaseRepo', () => {
    it('devrait synchroniser selon le type de ressource sans laisser fuiter les erreurs', async () => {
      const resource = buildResource({ type: ResourceTypes.CIRCLE })
      const repo = buildRepo()
      repository.findOne.mockResolvedValue({ resourceId: 'resource-1' } as ResourceMetaEntity)
      repository.save.mockRejectedValue(new Error('save failed'))

      await expect(
        (service as never as { onReleaseRepo: (p: unknown) => Promise<void> }).onReleaseRepo({
          repo,
          resource,
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('onCreateResource', () => {
    it('devrait upsert la dépendance de template si templateId est défini, sans laisser fuiter les erreurs', async () => {
      const resource = buildResource({ templateId: 'template-1' } as never)

      await (service as never as { onCreateResource: (p: unknown) => Promise<void> }).onCreateResource({ resource })

      expect(dependencyService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'resource-1', dependOnId: 'template-1' })
      )
    })

    it('ne devrait rien faire si templateId est absent', async () => {
      const resource = buildResource()

      await (service as never as { onCreateResource: (p: unknown) => Promise<void> }).onCreateResource({ resource })

      expect(dependencyService.upsert).not.toHaveBeenCalled()
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { EventService, LevelService, TopicService } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder, createUserEntity } from '@platon/core/testing/server'
import { ResourceOrderings, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { Optional } from 'typescript-optional'
import { DataSource } from 'typeorm'
import { ResourceEntity } from './resource.entity'
import { ResourceMetaEntity } from './metadata/metadata.entity'
import { ResourceService } from './resource.service'
import { ON_CREATE_RESOURCE_EVENT } from './resource.event'

describe('ResourceService', () => {
  let service: ResourceService
  let repository: MockRepository<ResourceEntity>
  let metadataRepo: MockRepository<ResourceMetaEntity>
  let dataSource: { query: jest.Mock; getRepository: jest.Mock }
  let levelService: jest.Mocked<LevelService>
  let topicService: jest.Mocked<TopicService>
  let eventService: jest.Mocked<EventService>

  beforeEach(async () => {
    dataSource = { query: jest.fn(), getRepository: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        { provide: getRepositoryToken(ResourceEntity), useValue: mockRepository<ResourceEntity>() },
        { provide: getRepositoryToken(ResourceMetaEntity), useValue: mockRepository<ResourceMetaEntity>() },
        { provide: DataSource, useValue: dataSource },
        { provide: LevelService, useValue: { findById: jest.fn(), findAll: jest.fn() } },
        { provide: TopicService, useValue: { findById: jest.fn(), findAll: jest.fn() } },
        { provide: EventService, useValue: { emit: jest.fn() } },
      ],
    }).compile()

    service = module.get(ResourceService)
    repository = module.get(getRepositoryToken(ResourceEntity))
    metadataRepo = module.get(getRepositoryToken(ResourceMetaEntity))
    levelService = module.get(LevelService)
    topicService = module.get(TopicService)
    eventService = module.get(EventService)
  })

  const buildResource = (overrides: Partial<ResourceEntity> = {}): ResourceEntity =>
    ({
      id: 'resource-1',
      name: 'Resource 1',
      type: ResourceTypes.CIRCLE,
      status: ResourceStatus.READY,
      personal: false,
      ...overrides,
    } as ResourceEntity)

  describe('tree', () => {
    it('devrait construire un arbre à partir des cercles et de leurs métadonnées de version', async () => {
      const root = buildResource({ id: 'root' })
      metadataRepo.find.mockResolvedValue([
        { resourceId: 'root', meta: { versions: [{ tag: 'v1' }, { tag: 'v2' }] } } as unknown as ResourceMetaEntity,
      ])

      const result = await service.tree([root])

      expect(result.id).toBe('root')
    })

    it('ne devrait pas requêter les métadonnées si la liste de cercles est vide', async () => {
      await expect(service.tree([])).rejects.toThrow('Root circle not found')

      expect(metadataRepo.find).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('devrait charger topics/levels par défaut', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      const resource = buildResource()
      qb.getOneOrFail.mockResolvedValue(resource)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getById('resource-1')

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('resource.topics', 'topic')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('resource.levels', 'level')
      expect(result).toBe(resource)
    })

    it('ne devrait pas charger topics/levels si resolveTags=false', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      qb.getOneOrFail.mockResolvedValue(buildResource())
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.getById('resource-1', false)

      expect(qb.leftJoinAndSelect).not.toHaveBeenCalled()
    })
  })

  describe('findByIdOrCode', () => {
    it('devrait chercher par id si la valeur est un UUID valide', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      const resource = buildResource()
      qb.getOne.mockResolvedValue(resource)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findByIdOrCode('123e4567-e89b-42d3-a456-556642440001')

      expect(qb.where).toHaveBeenCalledWith('resource.id = :id', { id: '123e4567-e89b-42d3-a456-556642440001' })
      expect(result.get()).toBe(resource)
    })

    it("devrait chercher par code si la valeur n'est pas un UUID", async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      qb.getOne.mockResolvedValue(null)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findByIdOrCode('my-code')

      expect(qb.where).toHaveBeenCalledWith('resource.code = :code', { code: 'my-code' })
      expect(result.isPresent()).toBe(false)
    })
  })

  describe('getPersonal', () => {
    it('devrait retourner le cercle personnel existant sans le recréer', async () => {
      const circle = buildResource({ personal: true })
      repository.findOne.mockResolvedValue(circle)
      const owner = createUserEntity()

      const result = await service.getPersonal(owner as never)

      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(circle)
    })

    it("devrait créer le cercle personnel s'il n'existe pas encore", async () => {
      repository.findOne.mockResolvedValue(null)
      const owner = createUserEntity({ id: 'owner-1', username: 'testuser' })
      const created = buildResource({ ownerId: 'owner-1', personal: true } as never)
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.getPersonal(owner as never)

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'owner-1', type: ResourceTypes.CIRCLE, personal: true })
      )
      expect(result).toBe(created)
    })
  })

  describe('getDescendants', () => {
    it('devrait retourner un tableau vide si le cercle racine est introuvable', async () => {
      repository.find.mockResolvedValue([])

      const result = await service.getDescendants('unknown')

      expect(result).toEqual([])
    })

    it('devrait retourner tous les descendants récursivement', async () => {
      const root = buildResource({ id: 'root' })
      const child1 = buildResource({ id: 'child1', parentId: 'root' } as never)
      const child2 = buildResource({ id: 'child2', parentId: 'child1' } as never)
      const unrelated = buildResource({ id: 'unrelated' })
      repository.find.mockResolvedValue([root, child1, child2, unrelated])

      const result = await service.getDescendants('root')

      expect(result.map((r) => r.id)).toEqual(['child1', 'child2'])
    })
  })

  describe('getParents', () => {
    it('devrait retourner un tableau vide si le cercle racine est introuvable', async () => {
      repository.find.mockResolvedValue([])

      const result = await service.getParents('unknown')

      expect(result).toEqual([])
    })

    it('devrait retourner tous les parents récursivement', async () => {
      const grandparent = buildResource({ id: 'grandparent' })
      const parent = buildResource({ id: 'parent', parentId: 'grandparent' } as never)
      const child = buildResource({ id: 'child', parentId: 'parent' } as never)
      repository.find.mockResolvedValue([grandparent, parent, child])

      const result = await service.getParents('child')

      expect(result.map((r) => r.id)).toEqual(['parent', 'grandparent'])
    })
  })

  describe('search', () => {
    it("devrait vérifier les permissions de l'utilisateur si userId est fourni", async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)
      dataSource.query.mockResolvedValue([{ resource_id: 'res-1' }])

      await service.search({}, 'user-1')

      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('ResourceMembers'), ['user-1'])
      expect(qb.andWhere).toHaveBeenCalledWith(expect.anything())
    })

    it("ne devrait pas vérifier les permissions si userId n'est pas fourni", async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({})

      expect(dataSource.query).not.toHaveBeenCalled()
    })

    it('devrait joindre les statistiques quand le tri est RELEVANCE (par défaut)', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({})

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(expect.anything(), 'stats', 'stats.id = resource.id')
      expect(qb.orderBy).toHaveBeenCalledWith('stats.score', 'DESC')
    })

    it('devrait filtrer par membres via un innerJoin', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ members: ['user-1'] })

      expect(qb.innerJoin).toHaveBeenCalledWith(
        expect.anything(),
        'member',
        'member.resource_id = resource.id AND member.user_id IN (:...ids)',
        { ids: ['user-1'] }
      )
    })

    it('devrait filtrer par types et statuts', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ types: [ResourceTypes.EXERCISE], status: [ResourceStatus.READY] })

      expect(qb.andWhere).toHaveBeenCalledWith('type IN (:...types)', { types: [ResourceTypes.EXERCISE] })
      expect(qb.andWhere).toHaveBeenCalledWith('status IN (:...status)', { status: [ResourceStatus.READY] })
    })

    it('devrait filtrer par texte de recherche avec f_unaccent', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ search: '  intro  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('f_unaccent'), { search: '%intro%' })
    })

    it('devrait trier par nom quand demandé explicitement', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ order: ResourceOrderings.NAME })

      expect(qb.orderBy).toHaveBeenCalledWith('resource.name', 'ASC')
    })

    it('devrait appliquer offset (skip) et limit (take)', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.search({ offset: 5, limit: 10 })

      expect(qb.skip).toHaveBeenCalledWith(5)
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('devrait retourner le résultat de getManyAndCount', async () => {
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      const resources = [buildResource()]
      qb.getManyAndCount.mockResolvedValue([resources, 1])
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.search({})

      expect(result).toEqual([resources, 1])
    })
  })

  describe('create', () => {
    it('devrait hériter du caractère personnel du parent et émettre un événement de création', async () => {
      const parent = buildResource({ id: 'parent-1', personal: true })
      repository.findOneOrFail.mockResolvedValue(parent)
      const created = buildResource({ id: 'new-resource', personal: true })
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.create({ parentId: 'parent-1', name: 'New' })

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ personal: true }))
      expect(eventService.emit).toHaveBeenCalledWith(ON_CREATE_RESOURCE_EVENT, { resource: created })
      expect(result).toBe(created)
    })
  })

  describe('delete', () => {
    it('devrait supprimer la ressource', async () => {
      const resource = buildResource()

      await service.delete(resource)

      expect(repository.remove).toHaveBeenCalledWith(resource)
    })
  })

  describe('update', () => {
    it("devrait rejeter avec NotFoundResponse si l'id ne correspond à aucune ressource", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.update('unknown', { name: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait fusionner les changements et sauvegarder quand un id est fourni', async () => {
      const resource = buildResource({ name: 'Old' })
      repository.findOne.mockResolvedValue(resource)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      const result = await service.update('resource-1', { name: 'New' })

      expect(result.name).toBe('New')
    })

    it('devrait accepter directement une entité sans requête supplémentaire', async () => {
      const resource = buildResource({ name: 'Old' })
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      await service.update(resource, { name: 'New' })

      expect(repository.findOne).not.toHaveBeenCalled()
    })
  })

  describe('deleteTemplate', () => {
    it('devrait retirer les informations de template', async () => {
      const resource = buildResource({ templateId: 'template-1' } as never)
      repository.findOneOrFail.mockResolvedValue(resource)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      const result = await service.deleteTemplate('resource-1')

      expect(result.templateId).toBeNull()
      expect((result as never as { template: unknown }).template).toBeNull()
    })
  })

  describe('move', () => {
    it('devrait déplacer une ressource simple sous le nouveau parent', async () => {
      const resource = buildResource({ id: 'res-1', type: ResourceTypes.CIRCLE })
      const parent = buildResource({ id: 'parent-1', personal: true })
      repository.findOneOrFail.mockResolvedValueOnce(resource).mockResolvedValueOnce(parent)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      const result = await service.move('res-1', 'parent-1')

      expect(result.parentId).toBe('parent-1')
      expect(result.personal).toBe(true)
    })

    it('devrait déplacer en cascade les exercices utilisés par une activité déplacée', async () => {
      const activity = buildResource({ id: 'activity-1', type: ResourceTypes.ACTIVITY })
      const parent = buildResource({ id: 'parent-1', personal: false })
      const exercise = buildResource({ id: 'exercise-1', type: ResourceTypes.EXERCISE })

      repository.findOneOrFail
        .mockResolvedValueOnce(activity)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(exercise)
        .mockResolvedValueOnce(parent)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      qb.getManyAndCount.mockResolvedValue([[exercise], 1])
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.move('activity-1', 'parent-1')

      expect(repository.findOneOrFail).toHaveBeenCalledTimes(4)
    })
  })

  describe('completion', () => {
    it('devrait agréger les niveaux, topics et noms de ressources', async () => {
      levelService.findAll.mockResolvedValue([[{ name: 'Level 1' }] as never, 1])
      topicService.findAll.mockResolvedValue([[{ name: 'Topic 1' }] as never, 1])
      repository.find.mockResolvedValue([{ name: 'Resource 1' } as ResourceEntity])
      const user = createUserEntity()

      const result = await service.completion(user as never)

      expect(result).toEqual({ levels: ['Level 1'], topics: ['Topic 1'], names: ['Resource 1'] })
    })
  })

  describe('fromInput', () => {
    it('ne devrait pas toucher levels/topics si non fournis', async () => {
      const result = await service.fromInput({ name: 'New', parentId: 'parent-1', type: ResourceTypes.CIRCLE })

      expect(result.levels).toBeUndefined()
      expect(result.topics).toBeUndefined()
    })

    it('devrait résoudre les niveaux fournis et rejeter si un niveau est introuvable', async () => {
      levelService.findById.mockResolvedValue(Optional.empty())

      await expect(service.fromInput({ levels: ['unknown'] } as never)).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait résoudre les topics fournis et rejeter si un topic est introuvable', async () => {
      topicService.findById.mockResolvedValue(Optional.empty())

      await expect(service.fromInput({ topics: ['unknown'] } as never)).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('notificationWatchers', () => {
    it('devrait retourner les ids uniques des membres, watchers et du propriétaire, sans valeur nulle', async () => {
      dataSource.query.mockResolvedValue([{ user_id: 'user-1' }, { user_id: null }, { user_id: 'user-2' }])

      const result = await service.notificationWatchers('resource-1')

      expect(result).toEqual(['user-1', 'user-2'])
    })
  })

  describe('isConfigurableExercise', () => {
    it("devrait retourner false si la ressource n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.isConfigurableExercise('unknown')

      expect(result).toBe(false)
    })

    it("devrait retourner false si la ressource n'est pas un exercice", async () => {
      repository.findOne.mockResolvedValue(buildResource({ type: ResourceTypes.CIRCLE }))

      const result = await service.isConfigurableExercise('resource-1')

      expect(result).toBe(false)
    })

    it('devrait retourner la valeur configurable des métadonnées pour un exercice', async () => {
      repository.findOne.mockResolvedValue(buildResource({ type: ResourceTypes.EXERCISE }))
      metadataRepo.findOne.mockResolvedValue({ meta: { configurable: true } } as unknown as ResourceMetaEntity)

      const result = await service.isConfigurableExercise('resource-1')

      expect(result).toBe(true)
    })
  })

  describe('handleDeleteOrphanCircles', () => {
    it('devrait supprimer tous les cercles personnels orphelins', async () => {
      const orphan1 = buildResource({ id: 'orphan-1' })
      const orphan2 = buildResource({ id: 'orphan-2' })
      repository.find.mockResolvedValue([orphan1, orphan2])

      await service.handleDeleteOrphanCircles()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(repository.remove).toHaveBeenCalledWith(orphan1)
      expect(repository.remove).toHaveBeenCalledWith(orphan2)
    })
  })

  describe('onTopicFusion / onLevelFusion', () => {
    it("devrait remplacer l'ancien topic par le nouveau dans chaque ressource concernée", async () => {
      const oldTopic = { id: 'old-topic' } as never
      const newTopic = { id: 'new-topic' } as never
      const resource = buildResource({ topics: [oldTopic] } as never)
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      qb.getMany.mockResolvedValue([resource])
      repository.createQueryBuilder.mockReturnValue(qb)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      await service.onTopicFusion({ oldTopic, newTopic })

      expect(resource.topics).toEqual([newTopic])
    })

    it("devrait remplacer l'ancien niveau par le nouveau dans chaque ressource concernée", async () => {
      const oldLevel = { id: 'old-level' } as never
      const newLevel = { id: 'new-level' } as never
      const resource = buildResource({ levels: [oldLevel] } as never)
      const qb = mockSelectQueryBuilder<ResourceEntity>()
      qb.getMany.mockResolvedValue([resource])
      repository.createQueryBuilder.mockReturnValue(qb)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      await service.onLevelFusion({ oldLevel, newLevel })

      expect(resource.levels).toEqual([newLevel])
    })
  })

  describe('updateCertification', () => {
    it("devrait rejeter avec NotFoundResponse si la ressource n'existe pas ou n'est pas un exercice", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.updateCertification('unknown', true)).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait créer les métadonnées si absentes puis définir certifiedTemplate', async () => {
      const resource = buildResource({ type: ResourceTypes.EXERCISE })
      repository.findOne.mockResolvedValue(resource)
      metadataRepo.findOne.mockResolvedValue(null)
      const created = { resourceId: 'resource-1', meta: {} } as unknown as ResourceMetaEntity
      metadataRepo.create.mockReturnValue(created)
      metadataRepo.save.mockImplementation(async (m) => m as ResourceMetaEntity)
      repository.save.mockImplementation(async (r) => r as ResourceEntity)

      await service.updateCertification('resource-1', true)

      expect((created.meta as { certifiedTemplate: boolean }).certifiedTemplate).toBe(true)
    })
  })
})

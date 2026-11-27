/* eslint-disable @typescript-eslint/no-explicit-any */
import { LevelEntity, TopicEntity, UserEntity } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { ResourceOrderings, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { DataSource, Repository } from 'typeorm'
import { ResourceMemberEntity } from './members/member.entity'
import { ResourceMetaEntity } from './metadata/metadata.entity'
import { ResourceEntity } from './resource.entity'
import { ResourceService } from './resource.service'
import { ResourceWatcherEntity } from './watchers/watcher.entity'

// Réplique la migration 1676148287928-EnableUnaccentSearch : createTestDatabase() ne fait que
// `synchronize: true` (schéma depuis les entités), ce qui ne joue jamais les migrations — donc
// f_unaccent() (utilisée par ResourceService.search()) n'existe pas dans la base de test sans ça.
const UNACCENT_SETUP_SQL = [
  `CREATE EXTENSION IF NOT EXISTS unaccent`,
  `
    CREATE OR REPLACE FUNCTION public.f_unaccent(text)
    RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
    $func$
    SELECT public.unaccent('public.unaccent', $1)
    $func$;
  `,
]

describe('ResourceService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let resourceRepo: Repository<ResourceEntity>
  let memberRepo: Repository<ResourceMemberEntity>
  let watcherRepo: Repository<ResourceWatcherEntity>
  let service: ResourceService

  const mockDeps = {
    levelService: { findById: jest.fn(), findAll: jest.fn() },
    topicService: { findById: jest.fn(), findAll: jest.fn() },
    eventService: { emit: jest.fn() },
  }

  beforeAll(async () => {
    testDb = await createTestDatabase(
      [
        UserEntity,
        LevelEntity,
        TopicEntity,
        ResourceEntity,
        ResourceMemberEntity,
        ResourceWatcherEntity,
        ResourceMetaEntity,
      ],
      UNACCENT_SETUP_SQL
    )
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    resourceRepo = dataSource.getRepository(ResourceEntity)
    memberRepo = dataSource.getRepository(ResourceMemberEntity)
    watcherRepo = dataSource.getRepository(ResourceWatcherEntity)

    service = new ResourceService(
      resourceRepo,
      dataSource.getRepository(ResourceMetaEntity),
      dataSource,
      mockDeps.levelService as any,
      mockDeps.topicService as any,
      mockDeps.eventService as any
    )
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "ResourceMembers" CASCADE')
    await dataSource.query('TRUNCATE "ResourceWatchers" CASCADE')
    await dataSource.query('TRUNCATE "Resources" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  let userCounter = 0
  const seedUser = async (overrides: Partial<UserEntity> = {}): Promise<UserEntity> => {
    userCounter++
    return userRepo.save(
      userRepo.create({
        username: `integration-user-${userCounter}`,
        firstName: 'Test',
        lastName: 'User',
        email: `integration-user-${userCounter}@test.local`,
        role: UserRoles.teacher,
        active: true,
        lastActivity: new Date(),
        ...overrides,
      })
    )
  }

  const seedResource = async (overrides: Partial<ResourceEntity> = {}): Promise<ResourceEntity> => {
    return resourceRepo.save(
      resourceRepo.create({
        name: 'Resource',
        type: ResourceTypes.CIRCLE,
        status: ResourceStatus.READY,
        personal: false,
        ...overrides,
      })
    )
  }

  describe('search — recherche insensible aux accents (f_unaccent)', () => {
    it('devrait trouver les ressources avec ou sans accent sur le terme recherché', async () => {
      const owner = await seedUser()
      await seedResource({ name: 'Éléphant rose', ownerId: owner.id })
      await seedResource({ name: 'Elephant bleu', ownerId: owner.id })
      await seedResource({ name: 'Girafe verte', ownerId: owner.id })

      const [results] = await service.search({ search: 'elephant', order: ResourceOrderings.NAME })

      expect(results.map((r) => r.name).sort()).toEqual(['Elephant bleu', 'Éléphant rose'])
    })

    it('devrait aussi matcher si le terme de recherche est lui-même accentué', async () => {
      const owner = await seedUser()
      await seedResource({ name: 'Elephant bleu', ownerId: owner.id })

      const [results] = await service.search({ search: 'éléphant', order: ResourceOrderings.NAME })

      expect(results).toHaveLength(1)
    })
  })

  describe('search — permissions (requête SQL brute members/watchers)', () => {
    it("devrait toujours exposer les ressources non personnelles, même sans lien avec l'utilisateur", async () => {
      const owner = await seedUser()
      const stranger = await seedUser()
      await seedResource({ name: 'Public circle', ownerId: owner.id, personal: false })

      const [results] = await service.search({ order: ResourceOrderings.NAME }, stranger.id)

      expect(results.map((r) => r.name)).toContain('Public circle')
    })

    it('ne devrait pas exposer une ressource personnelle à un utilisateur sans lien avec elle', async () => {
      const owner = await seedUser()
      const stranger = await seedUser()
      await seedResource({ name: 'Private circle', ownerId: owner.id, personal: true })

      const [results] = await service.search({ order: ResourceOrderings.NAME }, stranger.id)

      expect(results.map((r) => r.name)).not.toContain('Private circle')
    })

    it('devrait exposer une ressource personnelle à un membre avec droit de lecture', async () => {
      const owner = await seedUser()
      const member = await seedUser()
      const resource = await seedResource({ name: 'Private circle', ownerId: owner.id, personal: true })
      await memberRepo.save(
        memberRepo.create({
          resourceId: resource.id,
          userId: member.id,
          inviterId: owner.id,
          permissions: { read: true, write: false },
        })
      )

      const [results] = await service.search({ order: ResourceOrderings.NAME }, member.id)

      expect(results.map((r) => r.name)).toContain('Private circle')
    })

    it('devrait exposer une ressource personnelle à un observateur (watcher)', async () => {
      const owner = await seedUser()
      const watcher = await seedUser()
      const resource = await seedResource({ name: 'Private circle', ownerId: owner.id, personal: true })
      await watcherRepo.save(watcherRepo.create({ resourceId: resource.id, userId: watcher.id }))

      const [results] = await service.search({ order: ResourceOrderings.NAME }, watcher.id)

      expect(results.map((r) => r.name)).toContain('Private circle')
    })

    it('devrait toujours exposer une ressource personnelle à son propriétaire', async () => {
      const owner = await seedUser()
      await seedResource({ name: 'Private circle', ownerId: owner.id, personal: true })

      const [results] = await service.search({ order: ResourceOrderings.NAME }, owner.id)

      expect(results.map((r) => r.name)).toContain('Private circle')
    })
  })

  describe('create', () => {
    it('devrait créer une ressource et hériter du caractère personnel du parent', async () => {
      const owner = await seedUser()
      const parent = await seedResource({ name: 'Parent', ownerId: owner.id, personal: true })

      const created = await service.create({
        name: 'Child',
        parentId: parent.id,
        type: ResourceTypes.CIRCLE,
        ownerId: owner.id,
      })

      expect(created.personal).toBe(true)
      const reloaded = await resourceRepo.findOneOrFail({ where: { id: created.id } })
      expect(reloaded.parentId).toBe(parent.id)
    })

    it("devrait rejeter si le parent référencé n'existe pas (contrainte réelle)", async () => {
      await expect(
        service.create({ name: 'Orphan', parentId: '00000000-0000-0000-0000-000000000000', type: ResourceTypes.CIRCLE })
      ).rejects.toThrow()
    })
  })

  describe('move', () => {
    it('devrait déplacer une ressource et hériter du caractère personnel du nouveau parent', async () => {
      const owner = await seedUser()
      const oldParent = await seedResource({ name: 'Old parent', ownerId: owner.id, personal: false })
      const newParent = await seedResource({ name: 'New parent', ownerId: owner.id, personal: true })
      const resource = await seedResource({
        name: 'Movable',
        ownerId: owner.id,
        personal: false,
        parentId: oldParent.id,
      } as never)

      await service.move(resource.id, newParent.id)

      const reloaded = await resourceRepo.findOneOrFail({ where: { id: resource.id } })
      expect(reloaded.parentId).toBe(newParent.id)
      expect(reloaded.personal).toBe(true)
    })
  })

  describe('hiérarchie de cercles (tree / getDescendants / getParents)', () => {
    it('devrait retourner tous les descendants dans le bon ordre hiérarchique', async () => {
      const owner = await seedUser()
      const root = await seedResource({ name: 'Root', ownerId: owner.id })
      const child = await seedResource({ name: 'Child', ownerId: owner.id, parentId: root.id } as never)
      const grandchild = await seedResource({
        name: 'Grandchild',
        ownerId: owner.id,
        parentId: child.id,
      } as never)

      const descendants = await service.getDescendants(root.id)

      expect(descendants.map((r) => r.id)).toEqual([child.id, grandchild.id])
    })

    it('devrait retourner tous les parents dans le bon ordre hiérarchique', async () => {
      const owner = await seedUser()
      const root = await seedResource({ name: 'Root', ownerId: owner.id })
      const child = await seedResource({ name: 'Child', ownerId: owner.id, parentId: root.id } as never)
      const grandchild = await seedResource({
        name: 'Grandchild',
        ownerId: owner.id,
        parentId: child.id,
      } as never)

      const parents = await service.getParents(grandchild.id)

      expect(parents.map((r) => r.id)).toEqual([child.id, root.id])
    })

    it("devrait construire l'arbre des cercles avec les métadonnées de version", async () => {
      const owner = await seedUser()
      const root = await seedResource({ name: 'Root', ownerId: owner.id })
      const child = await seedResource({ name: 'Child', ownerId: owner.id, parentId: root.id } as never)

      const tree = await service.tree([root, child])

      expect(tree.id).toBe(root.id)
      expect(tree.children?.[0].id).toBe(child.id)
    })
  })
})

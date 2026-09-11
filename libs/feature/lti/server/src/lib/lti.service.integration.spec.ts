import { UserRoles } from '@platon/core/common'
import { UserEntity, UserService } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { DataSource, QueryFailedError, Repository } from 'typeorm'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LTIPayload } from './provider/payload'
import { StudentRoles } from './provider/roles'
import { LTIService } from './lti.service'

/**
 * Contrairement aux specs unitaires (repository/query builder mockés), ce fichier fait tourner
 * LTIService contre un vrai Postgres (Testcontainers) avec un vrai UserService, pour exercer les
 * contraintes uniques déclarées sur les entités et la boucle d'unicité de username de withLmsUser
 * contre de vraies requêtes plutôt que des mocks qui ne peuvent jamais échouer.
 */
describe('LTIService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let lmsRepo: Repository<LmsEntity>
  let lmsUserRepo: Repository<LmsUserEntity>
  let service: LTIService
  let userService: UserService

  const discovery = { providersWithMetaAtKey: jest.fn().mockResolvedValue([]) }

  beforeAll(async () => {
    testDb = await createTestDatabase([UserEntity, LmsEntity, LmsUserEntity])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    lmsRepo = dataSource.getRepository(LmsEntity)
    lmsUserRepo = dataSource.getRepository(LmsUserEntity)

    userService = new UserService(userRepo, { emit: jest.fn() } as never)
    service = new LTIService(lmsRepo, lmsUserRepo, userService, discovery as never)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "LmsUsers" CASCADE')
    await dataSource.query('TRUNCATE "Lmses" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  let userCounter = 0
  const seedUser = async (overrides: Partial<UserEntity> = {}): Promise<UserEntity> => {
    userCounter++
    return userRepo.save(
      userRepo.create({
        username: `lti-integration-user-${userCounter}`,
        firstName: 'Test',
        lastName: 'User',
        email: `lti-integration-user-${userCounter}@test.local`,
        role: UserRoles.student,
        active: true,
        lastActivity: new Date(),
        ...overrides,
      })
    )
  }

  const seedLms = async (overrides: Partial<LmsEntity> = {}): Promise<LmsEntity> => {
    return service.createLms({
      name: 'Moodle',
      url: 'https://moodle.example.com',
      outcomeUrl: 'https://moodle.example.com/outcomes',
      consumerKey: `consumer-key-${Math.random()}`,
      consumerSecret: 'secret',
      ...overrides,
    })
  }

  describe('contraintes uniques', () => {
    it('devrait rejeter la création de deux LMS avec la même consumerKey', async () => {
      await seedLms({ consumerKey: 'duplicate-key' })

      await expect(seedLms({ consumerKey: 'duplicate-key' })).rejects.toBeInstanceOf(QueryFailedError)
    })

    it('devrait rejeter deux LmsUser identiques (même lms/lmsUserId/user)', async () => {
      const lms = await seedLms()
      const user = await seedUser()

      await lmsUserRepo.save(
        lmsUserRepo.create({ lmsId: lms.id, lmsUserId: 'ext-1', userId: user.id, username: 'ext-user' })
      )

      await expect(
        lmsUserRepo.save(lmsUserRepo.create({ lmsId: lms.id, lmsUserId: 'ext-1', userId: user.id }))
      ).rejects.toBeInstanceOf(QueryFailedError)
    })
  })

  describe('searchLMS', () => {
    it('devrait filtrer par nom insensible à la casse et trier par nom', async () => {
      await seedLms({ name: 'Moodle UPEM' })
      await seedLms({ name: 'Canvas ULille' })

      const [items, total] = await service.searchLMS({ search: 'moodle' })

      expect(total).toBe(1)
      expect(items[0].name).toBe('Moodle UPEM')
    })

    it('devrait paginer avec offset/limit', async () => {
      await seedLms({ name: 'A LMS' })
      await seedLms({ name: 'B LMS' })
      await seedLms({ name: 'C LMS' })

      const [items, total] = await service.searchLMS({ offset: 1, limit: 1 })

      expect(total).toBe(3)
      expect(items).toHaveLength(1)
      expect(items[0].name).toBe('B LMS')
    })
  })

  describe('withLmsUser', () => {
    const buildPayload = (overrides: Partial<LTIPayload> = {}): LTIPayload =>
      ({ user_id: 'ext-user-1', roles: [StudentRoles.Student], ...overrides } as LTIPayload)

    it('devrait créer un nouvel utilisateur et un LmsUser liés en base', async () => {
      const lms = await seedLms()

      const lmsUser = await service.withLmsUser(lms, buildPayload({ ext_user_username: 'moodle_john' }))

      const persistedUser = await userRepo.findOne({ where: { username: 'moodle_john' } })
      expect(persistedUser).not.toBeNull()
      expect(persistedUser?.role).toBe(UserRoles.student)

      const persistedLmsUser = await lmsUserRepo.findOne({ where: { id: lmsUser.id } })
      expect(persistedLmsUser?.userId).toBe(persistedUser?.id)
      expect(persistedLmsUser?.lmsId).toBe(lms.id)
    })

    it('devrait suffixer le username avec un compteur si déjà pris en base réelle', async () => {
      await seedUser({ username: 'john' })
      const lms = await seedLms()

      const lmsUser = await service.withLmsUser(lms, buildPayload({ ext_user_username: 'john' }))

      const persistedUser = await userRepo.findOne({ where: { id: lmsUser.userId } })
      expect(persistedUser?.username).toBe('john1')
    })

    it('devrait upgrader le rôle en base pour un utilisateur existant recevant un rôle enseignant', async () => {
      const user = await seedUser({ role: UserRoles.student })
      const lms = await seedLms()
      await lmsUserRepo.save(
        lmsUserRepo.create({ lmsId: lms.id, lmsUserId: 'ext-user-1', userId: user.id, username: 'john' })
      )

      await service.withLmsUser(lms, buildPayload({ roles: ['urn:lti:role:ims/lis/Instructor' as never] }))

      const updatedUser = await userRepo.findOne({ where: { id: user.id } })
      expect(updatedUser?.role).toBe(UserRoles.teacher)
    })
  })
})

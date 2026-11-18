import { UserRoles } from '@platon/core/common'
import { UserEntity, UserService } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { DataSource, QueryFailedError, Repository } from 'typeorm'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LTIPayload } from './provider/payload'
import { Lti11StudentRoles } from './provider/roles.lti11'
import { LTIOldService } from './lti.service.old'
import { LmsUserKey, LmsUserService, NewLmsUser } from './lms-user.service'

/**
 * Unlike the unit specs (mocked repository/query builder), this file runs LTIOldService against a real
 * Postgres (Testcontainers) with a real UserService, to exercise the unique constraints declared on the
 * entities and the username uniqueness loop of withLmsUser against real queries rather than mocks that can never fail.
 */
describe('LTIOldService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let lmsRepo: Repository<LmsEntity>
  let lmsUserRepo: Repository<LmsUserEntity>
  let service: LTIOldService
  let userService: UserService

  const discovery = { providersWithMetaAtKey: jest.fn().mockResolvedValue([]) }

  beforeAll(async () => {
    testDb = await createTestDatabase([UserEntity, LmsEntity, LmsUserEntity])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    lmsRepo = dataSource.getRepository(LmsEntity)
    lmsUserRepo = dataSource.getRepository(LmsUserEntity)

    userService = new UserService(userRepo, { emit: jest.fn() } as never)
    service = new LTIOldService(lmsRepo, lmsUserRepo, new LmsUserService(lmsUserRepo, userService), discovery as never)
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

    it('devrait rejeter un second compte pour le même utilisateur LMS (même plateforme/lmsUserId)', async () => {
      const lms = await seedLms()
      const user = await seedUser()
      const otherUser = await seedUser()

      await lmsUserRepo.save(
        lmsUserRepo.create({ ltiPlatformId: lms.id, lmsUserId: 'ext-1', userId: user.id, username: 'ext-user' })
      )

      await expect(
        lmsUserRepo.save(lmsUserRepo.create({ ltiPlatformId: lms.id, lmsUserId: 'ext-1', userId: otherUser.id }))
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
      ({ user_id: 'ext-user-1', roles: [Lti11StudentRoles.Student], ...overrides } as LTIPayload)

    it('devrait créer un nouvel utilisateur et un LmsUser liés en base', async () => {
      const lms = await seedLms()

      const lmsUser = await service.withLmsUser(lms, buildPayload({ ext_user_username: 'moodle_john' }))

      const persistedUser = await userRepo.findOne({ where: { username: 'moodle_john' } })
      expect(persistedUser).not.toBeNull()
      expect(persistedUser?.role).toBe(UserRoles.student)

      const persistedLmsUser = await lmsUserRepo.findOne({ where: { id: lmsUser.id } })
      expect(persistedLmsUser?.userId).toBe(persistedUser?.id)
      expect(persistedLmsUser?.ltiPlatformId).toBe(lms.id)
    })

    it('devrait suffixer le username avec un compteur si déjà pris en base réelle', async () => {
      await seedUser({ username: 'john' })
      const lms = await seedLms()

      const lmsUser = await service.withLmsUser(lms, buildPayload({ ext_user_username: 'john' }))

      const persistedUser = await userRepo.findOne({ where: { id: lmsUser.userId } })
      expect(persistedUser?.username).toBe('john1')
    })

    /**
     * Runs two launches through `findOrCreate` at the same time: each waits for the other after looking up the
     * account (neither finds it), then both create their account in parallel. Without the barrier, the second
     * lookup often happens after the first account is created and the test would prove nothing.
     */
    const launchTogether = (keys: LmsUserKey[], username: string) => {
      const lmsUserService = new LmsUserService(lmsUserRepo, userService)
      let release!: () => void
      const allSearched = new Promise<void>((resolve) => (release = resolve))
      let searched = 0
      const describeNewUser = async (): Promise<NewLmsUser> => {
        if (++searched === keys.length) release()
        await allSearched
        return { lmsUsername: username, baseUsername: username, user: {} }
      }
      return Promise.all(keys.map((key) => lmsUserService.findOrCreate(key, UserRoles.student, describeNewUser)))
    }

    it("ne devrait créer qu'un compte pour deux premiers lancements simultanés du même utilisateur", async () => {
      const lms = await seedLms()
      const key = { ltiPlatformId: lms.id, lmsUserId: 'ext-user-1' }

      const [first, second] = await launchTogether([key, key], 'john')

      expect(first.userId).toBe(second.userId)
      expect(await userRepo.count()).toBe(1)
      expect(await lmsUserRepo.count()).toBe(1)
    })

    it('devrait donner des usernames distincts à deux utilisateurs LMS homonymes lancés simultanément', async () => {
      const lms = await seedLms()

      const lmsUsers = await launchTogether(
        [
          { ltiPlatformId: lms.id, lmsUserId: 'ext-a' },
          { ltiPlatformId: lms.id, lmsUserId: 'ext-b' },
        ],
        'john'
      )

      const usernames = await Promise.all(
        lmsUsers.map(async (lmsUser) => (await userRepo.findOne({ where: { id: lmsUser.userId } }))?.username)
      )
      expect(usernames.sort()).toEqual(['john', 'john1'])
    })

    it('devrait upgrader le rôle en base pour un utilisateur existant recevant un rôle enseignant', async () => {
      const user = await seedUser({ role: UserRoles.student })
      const lms = await seedLms()
      await lmsUserRepo.save(
        lmsUserRepo.create({ ltiPlatformId: lms.id, lmsUserId: 'ext-user-1', userId: user.id, username: 'john' })
      )

      await service.withLmsUser(lms, buildPayload({ roles: ['urn:lti:role:ims/lis/Instructor' as never] }))

      const updatedUser = await userRepo.findOne({ where: { id: user.id } })
      expect(updatedUser?.role).toBe(UserRoles.teacher)
    })
  })
})

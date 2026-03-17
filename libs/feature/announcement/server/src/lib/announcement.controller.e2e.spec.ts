import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import { IRequest } from '@platon/core/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const request = require('supertest')
import { Repository } from 'typeorm'
import { UserRoles } from '@platon/core/common'
import { UserEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { AnnouncementEntity } from './announcement.entity'
import { AnnouncementService } from './announcement.service'
import { AnnouncementController } from './announcement.controller'

/**
 * Tests E2E du module Announcement.
 *
 * On monte un vrai serveur NestJS avec une vraie base PostgreSQL (testcontainers).
 * Les guards auth/roles sont bypassés : on injecte l'utilisateur directement
 * via un middleware, ce qui permet de tester les routes HTTP de bout en bout
 * sans dépendre du module auth.
 */

let app: INestApplication
let db: TestDatabase
let userRepo: Repository<UserEntity>
let announcementRepo: Repository<AnnouncementEntity>
let adminUser: UserEntity
let studentUser: UserEntity

beforeAll(async () => {
  db = await createTestDatabase([UserEntity, AnnouncementEntity])

  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: db.container.getHost(),
        port: db.container.getMappedPort(5432),
        database: db.container.getDatabase(),
        username: db.container.getUsername(),
        password: db.container.getPassword(),
        entities: [UserEntity, AnnouncementEntity],
        synchronize: true,
      }),
      TypeOrmModule.forFeature([AnnouncementEntity, UserEntity]),
    ],
    controllers: [AnnouncementController],
    providers: [AnnouncementService],
  }).compile()

  app = moduleRef.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ transform: true, forbidUnknownValues: false }))

  // Middleware qui simule l'authentification.
  // Par défaut, l'utilisateur est admin. On peut changer via le header `x-test-role`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((req: IRequest, _res: any, next: () => void) => {
    const role = req.headers['x-test-role']
    req.user = role === 'student' ? studentUser : adminUser
    next()
  })

  await app.init()

  userRepo = db.dataSource.getRepository(UserEntity)
  announcementRepo = db.dataSource.getRepository(AnnouncementEntity)

  adminUser = await userRepo.save(
    userRepo.create({ username: 'admin-e2e', role: UserRoles.admin, firstName: 'Admin', lastName: 'Test' })
  )
  studentUser = await userRepo.save(
    userRepo.create({ username: 'student-e2e', role: UserRoles.student, firstName: 'Student', lastName: 'Test' })
  )
}, 60_000)

afterAll(async () => {
  await app.close()
  await db.teardown()
})

afterEach(async () => {
  await announcementRepo.query('TRUNCATE "Announcements" CASCADE')
})

const server = () => request(app.getHttpServer())

describe('POST /announcements', () => {
  it('should create an announcement and return 201', async () => {
    const res = await server()
      .post('/announcements')
      .send({ title: 'Hello', description: 'World', active: true })
      .expect(201)

    expect(res.body.resource).toMatchObject({
      title: 'Hello',
      description: 'World',
      active: true,
    })
    expect(res.body.resource.id).toBeDefined()
  })

  it('should return 400 when required fields are missing', async () => {
    await server().post('/announcements').send({ title: 'No description' }).expect(400)
  })
})

describe('GET /announcements', () => {
  it('should return all announcements', async () => {
    await announcementRepo.save([
      announcementRepo.create({ title: 'A1', description: 'Desc1', active: true }),
      announcementRepo.create({ title: 'A2', description: 'Desc2', active: false }),
    ])

    const res = await server().get('/announcements').expect(200)

    expect(res.body.total).toBe(2)
    expect(res.body.resources).toHaveLength(2)
  })

  it('should filter by search term (ILIKE)', async () => {
    await announcementRepo.save([
      announcementRepo.create({ title: 'Maintenance prévue', description: 'Desc', active: true }),
      announcementRepo.create({ title: 'Autre annonce', description: 'Desc', active: true }),
    ])

    const res = await server().get('/announcements').query({ search: 'maintenance' }).expect(200)

    expect(res.body.total).toBe(1)
    expect(res.body.resources[0].title).toBe('Maintenance prévue')
  })

  it('should filter by active status', async () => {
    await announcementRepo.save([
      announcementRepo.create({ title: 'Active', description: 'Desc', active: true }),
      announcementRepo.create({ title: 'Inactive', description: 'Desc', active: false }),
    ])

    const res = await server().get('/announcements').query({ active: 'true' }).expect(200)

    expect(res.body.total).toBe(1)
    expect(res.body.resources[0].title).toBe('Active')
  })
})

describe('GET /announcements/:id', () => {
  it('should return an announcement by id', async () => {
    const created = await announcementRepo.save(
      announcementRepo.create({ title: 'FindMe', description: 'Desc', active: true, publisher: adminUser })
    )

    const res = await server().get(`/announcements/${created.id}`).expect(200)

    expect(res.body.resource.title).toBe('FindMe')
    expect(res.body.resource.publisher).toBeDefined()
  })

  it('should return 404 for non-existent id', async () => {
    await server().get('/announcements/00000000-0000-0000-0000-000000000000').expect(404)
  })
})

describe('PATCH /announcements/:id', () => {
  it('should update an announcement', async () => {
    const created = await announcementRepo.save(
      announcementRepo.create({ title: 'Old', description: 'Desc', active: true })
    )

    const res = await server()
      .patch(`/announcements/${created.id}`)
      .send({ title: 'New', description: 'Desc', active: true })
      .expect(200)

    expect(res.body.resource.title).toBe('New')
  })
})

describe('DELETE /announcements/:id', () => {
  it('should delete an announcement', async () => {
    const created = await announcementRepo.save(
      announcementRepo.create({ title: 'ToDelete', description: 'Desc', active: true })
    )

    await server().delete(`/announcements/${created.id}`).expect(200)

    const found = await announcementRepo.findOneBy({ id: created.id })
    expect(found).toBeNull()
  })

  it('should return 404 when deleting non-existent announcement', async () => {
    await server().delete('/announcements/00000000-0000-0000-0000-000000000000').expect(404)
  })
})

describe('GET /announcements/visible', () => {
  it('should return only active announcements visible to the user role', async () => {
    await announcementRepo.save([
      announcementRepo.create({ title: 'ForAll', description: 'Desc', active: true, targetedRoles: [] }),
      announcementRepo.create({
        title: 'ForAdmin',
        description: 'Desc',
        active: true,
        targetedRoles: [UserRoles.admin],
      }),
      announcementRepo.create({
        title: 'ForStudent',
        description: 'Desc',
        active: true,
        targetedRoles: [UserRoles.student],
      }),
      announcementRepo.create({ title: 'Inactive', description: 'Desc', active: false }),
    ])

    // En tant qu'admin
    const adminRes = await server().get('/announcements/visible').expect(200)
    const adminTitles = adminRes.body.resources.map((r: { title: string }) => r.title)
    expect(adminTitles).toContain('ForAll')
    expect(adminTitles).toContain('ForAdmin')
    expect(adminTitles).not.toContain('Inactive')

    // En tant qu'étudiant
    const studentRes = await server().get('/announcements/visible').set('x-test-role', 'student').expect(200)
    const studentTitles = studentRes.body.resources.map((r: { title: string }) => r.title)
    expect(studentTitles).toContain('ForAll')
    expect(studentTitles).toContain('ForStudent')
    expect(studentTitles).not.toContain('ForAdmin')
    expect(studentTitles).not.toContain('Inactive')
  })
})

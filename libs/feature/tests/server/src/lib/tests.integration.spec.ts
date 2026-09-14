import { UserRoles } from '@platon/core/common'
import { UserEntity, UserGroupEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { CourseEntity, CourseMemberEntity } from '@platon/feature/course/server'
import { DataSource, Repository } from 'typeorm'
import { TestEntity } from './test.entity'
import { TestsCandidatesEntity } from './tests-candidates/tests-candidates.entity'

/**
 * Contrairement aux specs unitaires (repository mocké), ce fichier vérifie contre un vrai Postgres
 * (Testcontainers) que les cascades DB déclarées sur TestEntity et TestsCandidatesEntity
 * (onDelete: 'CASCADE') fonctionnent réellement — invisible à un mock de repository qui ne
 * supprime jamais réellement de lignes liées.
 */
describe('feature/tests/server entities (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let courseRepo: Repository<CourseEntity>
  let courseMemberRepo: Repository<CourseMemberEntity>
  let testRepo: Repository<TestEntity>
  let candidateRepo: Repository<TestsCandidatesEntity>

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      UserGroupEntity,
      CourseEntity,
      CourseMemberEntity,
      TestEntity,
      TestsCandidatesEntity,
    ])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    courseRepo = dataSource.getRepository(CourseEntity)
    courseMemberRepo = dataSource.getRepository(CourseMemberEntity)
    testRepo = dataSource.getRepository(TestEntity)
    candidateRepo = dataSource.getRepository(TestsCandidatesEntity)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "TestsCandidates" CASCADE')
    await dataSource.query('TRUNCATE "Test" CASCADE')
    await dataSource.query('TRUNCATE "CourseMembers" CASCADE')
    await dataSource.query('TRUNCATE "Courses" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  let userCounter = 0
  const seedUser = async (): Promise<UserEntity> => {
    userCounter++
    return userRepo.save(
      userRepo.create({
        username: `tests-integration-user-${userCounter}`,
        firstName: 'Test',
        lastName: 'User',
        email: `tests-integration-user-${userCounter}@test.local`,
        role: UserRoles.student,
        active: true,
        lastActivity: new Date(),
      })
    )
  }

  const seedCourse = async (ownerId: string): Promise<CourseEntity> => {
    return courseRepo.save(courseRepo.create({ name: 'Course', ownerId }))
  }

  it('devrait supprimer automatiquement le Test associé quand son cours est supprimé', async () => {
    const owner = await seedUser()
    const course = await seedCourse(owner.id)
    const test = await testRepo.save(
      testRepo.create({ courseId: course.id, terms: {}, mailContent: {}, mailSubject: 'Subject' })
    )

    await courseRepo.delete(course.id)

    expect(await testRepo.findOneBy({ id: test.id })).toBeNull()
  })

  it("devrait supprimer automatiquement le TestsCandidates associé quand l'utilisateur est supprimé", async () => {
    const owner = await seedUser()
    const course = await seedCourse(owner.id)
    const student = await seedUser()
    const member = await courseMemberRepo.save(
      courseMemberRepo.create({ courseId: course.id, userId: student.id, role: 'student' as never })
    )
    const candidate = await candidateRepo.save(
      candidateRepo.create({ userId: student.id, courseMemberId: member.id, linkId: 'link-abc' })
    )

    await userRepo.delete(student.id)

    expect(await candidateRepo.findOneBy({ id: candidate.id })).toBeNull()
  })

  it('devrait supprimer automatiquement le TestsCandidates associé quand le CourseMember est supprimé', async () => {
    const owner = await seedUser()
    const course = await seedCourse(owner.id)
    const student = await seedUser()
    const member = await courseMemberRepo.save(
      courseMemberRepo.create({ courseId: course.id, userId: student.id, role: 'student' as never })
    )
    const candidate = await candidateRepo.save(
      candidateRepo.create({ userId: student.id, courseMemberId: member.id, linkId: 'link-def' })
    )

    await courseMemberRepo.delete(member.id)

    expect(await candidateRepo.findOneBy({ id: candidate.id })).toBeNull()
  })
})

import { UserRoles } from '@platon/core/common'
import { UserEntity, UserGroupEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { DataSource, QueryFailedError, Repository } from 'typeorm'
import { CourseGroupEntity } from './course-group/course-group.entity'
import { CourseMemberEntity } from './course-member/course-member.entity'
import { CourseSubscriber } from './course.subscriber'
import { CourseEntity } from './entites/course.entity'
import { CourseSectionEntity } from './section/section.entity'
import { ActivityEntity } from './activity/activity.entity'

/**
 * Contrairement aux specs unitaires (repository/query builder mockés), ce fichier fait tourner
 * du code contre un vrai Postgres (Testcontainers) pour exercer ce qu'aucun mock ne peut valider :
 * le subscriber TypeORM déclenché par de vrais events d'insertion, les contraintes uniques réelles
 * sur CourseMemberEntity, et les cascades onDelete réelles depuis CourseEntity.
 */
describe('feature/course/server entities (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let courseRepo: Repository<CourseEntity>
  let memberRepo: Repository<CourseMemberEntity>
  let sectionRepo: Repository<CourseSectionEntity>
  let activityRepo: Repository<ActivityEntity>

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      UserGroupEntity,
      CourseEntity,
      CourseMemberEntity,
      CourseGroupEntity,
      CourseSectionEntity,
      ActivityEntity,
    ])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    courseRepo = dataSource.getRepository(CourseEntity)
    memberRepo = dataSource.getRepository(CourseMemberEntity)
    sectionRepo = dataSource.getRepository(CourseSectionEntity)
    activityRepo = dataSource.getRepository(ActivityEntity)

    // Chaque subscriber s'enregistre lui-même sur dataSource.subscribers — reproduit exactement
    // ce que Nest fait au bootstrap, une fois par provider.
    new CourseSubscriber(dataSource)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "Activities" CASCADE')
    await dataSource.query('TRUNCATE "CourseSections" CASCADE')
    await dataSource.query('TRUNCATE "CourseMembers" CASCADE')
    await dataSource.query('TRUNCATE "Courses" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  let userCounter = 0
  const seedUser = async (): Promise<UserEntity> => {
    userCounter++
    return userRepo.save(
      userRepo.create({
        username: `course-integration-user-${userCounter}`,
        firstName: 'Test',
        lastName: 'User',
        email: `course-integration-user-${userCounter}@test.local`,
        role: UserRoles.teacher,
        active: true,
        lastActivity: new Date(),
      })
    )
  }

  describe('CourseSubscriber', () => {
    it("devrait ajouter automatiquement le propriétaire comme membre enseignant à l'insertion", async () => {
      const owner = await seedUser()

      const course = await courseRepo.save(courseRepo.create({ name: 'My course', ownerId: owner.id }))

      const member = await memberRepo.findOne({ where: { courseId: course.id, userId: owner.id } })
      expect(member).not.toBeNull()
      expect(member?.role).toBe(CourseMemberRoles.teacher)
    })
  })

  describe('contraintes uniques sur CourseMemberEntity', () => {
    it('devrait rejeter deux adhésions directes du même utilisateur au même cours', async () => {
      const owner = await seedUser()
      const student = await seedUser()
      const course = await courseRepo.save(courseRepo.create({ name: 'Course', ownerId: owner.id }))
      await memberRepo.save(
        memberRepo.create({ courseId: course.id, userId: student.id, role: CourseMemberRoles.student })
      )

      await expect(
        memberRepo.insert({ courseId: course.id, userId: student.id, role: CourseMemberRoles.student })
      ).rejects.toBeInstanceOf(QueryFailedError)
    })
  })

  describe('cascades depuis CourseEntity', () => {
    it('devrait supprimer les membres, sections et activités quand le cours est supprimé', async () => {
      const owner = await seedUser()
      const course = await courseRepo.save(courseRepo.create({ name: 'Course', ownerId: owner.id }))
      const section = await sectionRepo.save(sectionRepo.create({ courseId: course.id, name: 'Section 1', order: 0 }))
      await activityRepo.save(
        activityRepo.create({
          courseId: course.id,
          sectionId: section.id,
          creatorId: owner.id,
          source: { variables: {} } as never,
        })
      )

      await courseRepo.delete(course.id)

      expect(await memberRepo.find({ where: { courseId: course.id } })).toHaveLength(0)
      expect(await sectionRepo.find({ where: { courseId: course.id } })).toHaveLength(0)
      expect(await activityRepo.find({ where: { courseId: course.id } })).toHaveLength(0)
    })
  })
})

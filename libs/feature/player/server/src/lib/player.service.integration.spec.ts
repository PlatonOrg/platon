/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSource, Repository } from 'typeorm'
import { UserEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { ActivityEntity } from '@platon/feature/course/server'
import { CourseEntity } from '@platon/feature/course/server'
import { CourseSectionEntity } from '@platon/feature/course/server'
import { CorrectionEntity, SessionEntity } from '@platon/feature/result/server'
// Non exportée publiquement mais nécessaire car SessionEntity a une @OneToMany vers elle
import { StudentSubmissionEntity } from '@platon/feature/result/server' //'../../../../result/server/src/lib/submissions/submission.entity'
import { UserRoles } from '@platon/core/common'
import { PlayerService } from './player.service'

describe('PlayerService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let courseRepo: Repository<CourseEntity>
  let sectionRepo: Repository<CourseSectionEntity>
  let activityRepo: Repository<ActivityEntity>
  let sessionRepo: Repository<SessionEntity>
  let service: PlayerService

  const mockDeps = {
    eventService: { emit: jest.fn() },
    sandboxService: { build: jest.fn(), buildNext: jest.fn(), downloadEnvironment: jest.fn(), run: jest.fn() },
    answerService: { create: jest.fn(), findAllOfSession: jest.fn(), findGradesOfSession: jest.fn() },
    sessionService: {
      findById: jest.fn(),
      findUserActivity: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAllWithParent: jest.fn(),
      findExerciseSessionById: jest.fn(),
      findExerciseSessionByActivityId: jest.fn(),
    },
    activityService: { findByIdForUser: jest.fn(), updateActivitiesDates: jest.fn() },
    resourceFileService: { compile: jest.fn(), getTitle: jest.fn() },
    peerService: { getNextCopy: jest.fn(), createMatch: jest.fn(), resolveGame: jest.fn() },
  }

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      CourseEntity,
      CourseSectionEntity,
      ActivityEntity,
      CorrectionEntity,
      SessionEntity,
      StudentSubmissionEntity,
    ])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    courseRepo = dataSource.getRepository(CourseEntity)
    sectionRepo = dataSource.getRepository(CourseSectionEntity)
    activityRepo = dataSource.getRepository(ActivityEntity)
    sessionRepo = dataSource.getRepository(SessionEntity)

    service = new PlayerService(
      dataSource,
      mockDeps.eventService as any,
      mockDeps.sandboxService as any,
      mockDeps.answerService as any,
      mockDeps.sessionService as any,
      mockDeps.activityService as any,
      mockDeps.resourceFileService as any,
      mockDeps.peerService as any
    )
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "Sessions" CASCADE')
    await dataSource.query('TRUNCATE "Activities" CASCADE')
    await dataSource.query('TRUNCATE "CourseSections" CASCADE')
    await dataSource.query('TRUNCATE "Courses" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  // ─── helpers ──────────────────────────────────────────────────────────────

  const seedUser = async (): Promise<UserEntity> => {
    const user = userRepo.create({
      username: 'player-integration-user',
      firstName: 'Max',
      lastName: 'Tekpa',
      email: 'tekpa@integration.test',
      role: UserRoles.teacher,
      active: true,
      lastActivity: new Date(),
    })
    return userRepo.save(user)
  }

  const seedActivity = async (userId: string): Promise<ActivityEntity> => {
    const course = await courseRepo.save(courseRepo.create({ name: 'Test Course', ownerId: userId }))
    const section = await sectionRepo.save(sectionRepo.create({ name: 'Section 1', order: 0, courseId: course.id }))
    return activityRepo.save(
      activityRepo.create({
        creatorId: userId,
        courseId: course.id,
        sectionId: section.id,
        source: {
          abspath: '/test/activity.pla',
          variables: {} as any,
          dependencies: [],
        },
        ignoreRestrictions: true,
      })
    )
  }

  const seedSession = async (activityId: string, userId: string): Promise<SessionEntity> => {
    return sessionRepo.save(
      sessionRepo.create({
        activityId,
        userId,
        variables: {} as any,
        grade: -1,
        attempts: 0,
        isBuilt: false,
        source: {
          abspath: '/test/exercise.ple',
          variables: {} as any,
          dependencies: [],
        },
      })
    )
  }

  // ─── onReloadActivity ─────────────────────────────────────────────────────

  describe('onReloadActivity', () => {
    it('should delete all sessions linked to the given activity', async () => {
      const user = await seedUser()
      const activity = await seedActivity(user.id)
      await seedSession(activity.id, user.id)
      await seedSession(activity.id, user.id)

      const beforeCount = await sessionRepo.count({ where: { activityId: activity.id } })
      expect(beforeCount).toBe(2)

      await (service as any).onReloadActivity({ activity })

      const afterCount = await sessionRepo.count({ where: { activityId: activity.id } })
      expect(afterCount).toBe(0)
    })

    it('should not delete sessions belonging to other activities', async () => {
      const user = await seedUser()
      const activity1 = await seedActivity(user.id)
      const activity2 = await seedActivity(user.id)

      await seedSession(activity1.id, user.id)
      await seedSession(activity2.id, user.id)

      await (service as any).onReloadActivity({ activity: activity1 })

      const remaining = await sessionRepo.count({ where: { activityId: activity2.id } })
      expect(remaining).toBe(1)
    })

    it('should not throw when no sessions exist for the activity', async () => {
      const user = await seedUser()
      const activity = await seedActivity(user.id)

      await expect((service as any).onReloadActivity({ activity })).resolves.not.toThrow()
    })
  })
})

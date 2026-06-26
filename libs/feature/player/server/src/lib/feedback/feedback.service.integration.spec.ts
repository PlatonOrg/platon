/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto'
import { DataSource, Repository } from 'typeorm'
import { UserEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { UserRoles } from '@platon/core/common'
import { ActivityEntity, CourseEntity, CourseSectionEntity } from '@platon/feature/course/server'
import { CorrectionEntity, SessionDataEntity, SessionEntity } from '@platon/feature/result/server'
// Non exportée publiquement mais nécessaire car SessionEntity a une @OneToMany vers elle
import { StudentSubmissionEntity } from '@platon/feature/result/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { FeedbackCategoryValue } from '@platon/feature/player/common'
import { FeedbackEntity } from './feedback.entity'
import { FeedbackService } from './feedback.service'

describe('FeedbackService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let sessionRepo: Repository<SessionEntity>
  let sessionDataRepo: Repository<SessionDataEntity>
  let feedbackRepo: Repository<FeedbackEntity>
  let service: FeedbackService

  const emailService = {
    send: jest.fn().mockResolvedValue(true),
    sendToPlatonTeam: jest.fn().mockResolvedValue(true),
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
      SessionDataEntity,
      FeedbackEntity,
    ])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    sessionRepo = dataSource.getRepository(SessionEntity)
    sessionDataRepo = dataSource.getRepository(SessionDataEntity)
    feedbackRepo = dataSource.getRepository(FeedbackEntity)

    service = new FeedbackService(feedbackRepo, sessionRepo, emailService as any)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await dataSource.query('TRUNCATE "Feedbacks" CASCADE')
    await dataSource.query('TRUNCATE "SessionData" CASCADE')
    await dataSource.query('TRUNCATE "Sessions" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  // ─── helpers ──────────────────────────────────────────────────────────────

  const seedUser = async (overrides: Partial<UserEntity> = {}): Promise<UserEntity> => {
    const suffix = Math.random().toString(36).slice(2)
    return userRepo.save(
      userRepo.create({
        username: `feedback-integration-${suffix}`,
        firstName: 'Test',
        lastName: 'User',
        email: `${suffix}@integration.test`,
        role: UserRoles.teacher,
        active: true,
        lastActivity: new Date(),
        ...overrides,
      })
    )
  }

  const seedSession = async (): Promise<SessionEntity> => {
    return sessionRepo.save(
      sessionRepo.create({
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

  const seedSessionData = async (
    sessionId: string,
    overrides: Partial<SessionDataEntity> = {}
  ): Promise<SessionDataEntity> => {
    return sessionDataRepo.save(
      sessionDataRepo.create({
        id: sessionId,
        grade: -1,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        resourceId: randomUUID(),
        resourceType: ResourceTypes.EXERCISE,
        resourceName: 'Connaissez vous les drapeaux ?',
        resourceOwnerId: '00000000-0000-0000-0000-000000000000',
        resourceVersion: 'main',
        circleId: randomUUID(),
        circleName: 'Test Circle',
        ...overrides,
      })
    )
  }

  // ─── submitFeedback ───────────────────────────────────────────────────────

  it('should resolve the resource owner as creator for a standalone exercise (no activity)', async () => {
    const sender = await seedUser({ role: UserRoles.student })
    const creator = await seedUser({ role: UserRoles.teacher })
    const session = await seedSession()
    await seedSessionData(session.id, { resourceOwnerId: creator.id })

    await service.submitFeedback(
      {
        sessionId: session.id,
        exerciseTitle: 'Connaissez vous les drapeaux ?',
        category: FeedbackCategoryValue.STATEMENT,
        message: "L'énoncé n'est pas assez explicite.",
      },
      sender.id
    )

    expect(emailService.send).toHaveBeenCalledWith(expect.objectContaining({ to: creator.email }))
    expect(emailService.sendToPlatonTeam).not.toHaveBeenCalled()

    const saved = await feedbackRepo.findOne({ where: { sessionId: session.id } })
    expect(saved?.creatorId).toBe(creator.id)
    expect(saved?.senderId).toBe(sender.id)
    expect(saved?.category).toBe(FeedbackCategoryValue.STATEMENT)
  })

  it('should prioritize the activity creator over the resource owner when both are set', async () => {
    const sender = await seedUser({ role: UserRoles.student })
    const resourceOwner = await seedUser({ role: UserRoles.teacher })
    const activityCreator = await seedUser({ role: UserRoles.teacher })
    const session = await seedSession()
    await seedSessionData(session.id, {
      resourceOwnerId: resourceOwner.id,
      activityCreatorId: activityCreator.id,
    })

    await service.submitFeedback({ sessionId: session.id, category: FeedbackCategoryValue.TECHNICAL }, sender.id)

    const saved = await feedbackRepo.findOne({ where: { sessionId: session.id } })
    expect(saved?.creatorId).toBe(activityCreator.id)
    expect(emailService.sendToPlatonTeam).toHaveBeenCalledTimes(1)
    expect(emailService.send).not.toHaveBeenCalled()
  })

  it('should throw and persist nothing when the session has no related SessionData row', async () => {
    const sender = await seedUser({ role: UserRoles.student })
    const session = await seedSession()
    // pas de seedSessionData ici : la session n'a aucune ligne SessionData associée

    await expect(
      service.submitFeedback({ sessionId: session.id, category: FeedbackCategoryValue.OTHER }, sender.id)
    ).rejects.toThrow()

    const count = await feedbackRepo.count({ where: { sessionId: session.id } })
    expect(count).toBe(0)
    expect(emailService.send).not.toHaveBeenCalled()
    expect(emailService.sendToPlatonTeam).not.toHaveBeenCalled()
  })
})

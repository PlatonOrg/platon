/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenResponse, NotFoundResponse, UserRoles } from '@platon/core/common'
import { createUserEntity } from '@platon/core/testing/server'
import { DataSource } from 'typeorm'
import { PlayerService } from './player.service'
import { SandboxService } from './sandboxes/sandbox.service'
import { EventService } from '@platon/core/server'
import { AnswerService, SessionService } from '@platon/feature/result/server'
import { ActivityService, CourseNotificationService } from '@platon/feature/course/server'
import { ResourceFileService } from '@platon/feature/resource/server'
import { PeerService } from '@platon/feature/peer/server'
import {
  createMockSession,
  createMockActivitySession,
  createMockActivityEntity,
  createMockAnswer,
  createMockExercisePlayer,
  createMockActivityPlayer,
} from './factories/player.factory'

jest.mock('@platon/feature/compiler', () => ({
  ...jest.requireActual('@platon/feature/compiler'),
  extractExercisesFromActivityVariables: jest.fn().mockReturnValue([]),
}))

jest.mock('@platon/feature/player/common', () => ({
  ...jest.requireActual('@platon/feature/player/common'),
  withActivityPlayer: jest.fn().mockReturnValue({ sessionId: 'mock-activity-player' }),
  withExercisePlayer: jest.fn().mockReturnValue({ sessionId: 'mock-exercise-player' }),
  updateActivityNavigationState: jest.fn(),
  withSessionAccessGuard: jest.fn().mockImplementation((s: any) => {
    if (!s) throw new NotFoundResponse('Session not found')
    return s
  }),
  withActivityFeedbacksGuard: jest.fn().mockImplementation((s: any) => s),
}))

describe('PlayerService', () => {
  let service: PlayerService
  let sandboxService: jest.Mocked<SandboxService>
  let answerService: jest.Mocked<AnswerService>
  let sessionService: jest.Mocked<SessionService>
  let activityService: jest.Mocked<ActivityService>
  let resourceFileService: jest.Mocked<ResourceFileService>
  let peerService: jest.Mocked<PeerService>
  let eventService: jest.Mocked<EventService>
  let dataSource: any
  let mockEntityManager: any

  beforeEach(async () => {
    mockEntityManager = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    }

    dataSource = {
      transaction: jest.fn().mockImplementation((fn: any) => fn(mockEntityManager)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: EventService,
          useValue: { emit: jest.fn() },
        },
        {
          provide: SandboxService,
          useValue: {
            build: jest.fn(),
            buildNext: jest.fn(),
            downloadEnvironment: jest.fn(),
            run: jest.fn(),
          },
        },
        {
          provide: AnswerService,
          useValue: {
            create: jest.fn(),
            findAllOfSession: jest.fn(),
            findGradesOfSession: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            findById: jest.fn(),
            findUserActivity: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findAllWithParent: jest.fn(),
            findExerciseSessionById: jest.fn(),
            findExerciseSessionByActivityId: jest.fn(),
          },
        },
        {
          provide: ActivityService,
          useValue: {
            findByIdForUser: jest.fn(),
            updateActivitiesDates: jest.fn(),
          },
        },
        {
          provide: ResourceFileService,
          useValue: {
            compile: jest.fn(),
            getTitle: jest.fn(),
          },
        },
        {
          provide: PeerService,
          useValue: {
            getNextCopy: jest.fn(),
            createMatch: jest.fn(),
            resolveGame: jest.fn(),
          },
        },
        {
          provide: CourseNotificationService,
          useValue: {
            notifyModerationActivityChanges: jest.fn(),
            notifyExerciseChanges: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<PlayerService>(PlayerService)
    sandboxService = module.get(SandboxService)
    answerService = module.get(AnswerService)
    sessionService = module.get(SessionService)
    activityService = module.get(ActivityService)
    resourceFileService = module.get(ResourceFileService)
    peerService = module.get(PeerService)
    eventService = module.get(EventService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ─── answers ──────────────────────────────────────────────────────────────

  describe('answers', () => {
    it('should return exercise players for all answers of a session', async () => {
      const session = createMockSession()
      const answer = createMockAnswer()
      sessionService.findById.mockResolvedValue(session as any)
      answerService.findAllOfSession.mockResolvedValue([answer] as any)

      const result = await service.answers('session-test-id')

      expect(sessionService.findById).toHaveBeenCalledWith('session-test-id', {
        parent: true,
        activity: true,
        correction: true,
      })
      expect(answerService.findAllOfSession).toHaveBeenCalledWith('session-test-id')
      expect(result).toHaveLength(1)
    })

    it('should throw NotFoundResponse when session does not exist', async () => {
      sessionService.findById.mockResolvedValue(null)

      await expect(service.answers('non-existent-id')).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  // ─── preview ──────────────────────────────────────────────────────────────

  describe('preview', () => {
    it('should return an exercise player for EXERCISE resource type', async () => {
      const exerciseSource = {
        abspath: '/test/exercise.ple',
        variables: { seed: 42 },
        dependencies: [],
      }
      const resource = { type: 'EXERCISE', publicPreview: true }
      resourceFileService.compile.mockResolvedValue({ source: exerciseSource, resource } as any)

      const session = createMockSession({ source: exerciseSource })
      sessionService.create.mockResolvedValue(session as any)
      sandboxService.build.mockResolvedValue({ envid: 'env-id', variables: { seed: 42 } } as any)
      sessionService.update.mockResolvedValue(undefined)

      const result = await service.preview({ version: 'main', resource: 'resource-id' })

      expect(resourceFileService.compile).toHaveBeenCalled()
      expect(sandboxService.build).toHaveBeenCalled()
      expect(result.exercise).toBeDefined()
      expect(result.activity).toBeUndefined()
    })

    it('should return an activity player for ACTIVITY resource type', async () => {
      const activitySource = {
        abspath: '/test/activity.pla',
        variables: {
          seed: 42,
          navigation: {
            started: false,
            terminated: false,
            exercises: [],
            nextExercisesHistory: [],
            nextExercisesHistoryPosition: -1,
          },
          settings: {},
          exerciseGroups: {},
        },
        dependencies: [],
      }
      const resource = { type: 'ACTIVITY', publicPreview: true }
      resourceFileService.compile.mockResolvedValue({ source: activitySource, resource } as any)

      const session = createMockActivitySession()
      sessionService.create.mockResolvedValue(session as any)
      sessionService.update.mockResolvedValue(undefined)

      const result = await service.preview({ version: 'main', resource: 'resource-id' })

      expect(sandboxService.build).not.toHaveBeenCalled()
      expect(result.activity).toBeDefined()
      expect(result.exercise).toBeUndefined()
    })

    it('should throw ForbiddenResponse when resource is not public and user is not a teacher', async () => {
      const resource = { type: 'EXERCISE', publicPreview: false }
      resourceFileService.compile.mockResolvedValue({
        source: { abspath: '/test.ple', variables: { seed: 0 }, dependencies: [] },
        resource,
      } as any)

      const student = createUserEntity({ role: UserRoles.student })

      await expect(
        service.preview({ version: 'main', resource: 'resource-id' }, student as any)
      ).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('should allow teacher to preview non-public resource', async () => {
      const exerciseSource = {
        abspath: '/test/exercise.ple',
        variables: { seed: 42 },
        dependencies: [],
      }
      const resource = { type: 'EXERCISE', publicPreview: false }
      resourceFileService.compile.mockResolvedValue({ source: exerciseSource, resource } as any)

      const session = createMockSession({ source: exerciseSource })
      sessionService.create.mockResolvedValue(session as any)
      sandboxService.build.mockResolvedValue({ envid: 'env-id', variables: {} } as any)
      sessionService.update.mockResolvedValue(undefined)

      const teacher = createUserEntity({ role: UserRoles.teacher })

      await expect(service.preview({ version: 'main', resource: 'resource-id' }, teacher as any)).resolves.toBeDefined()
    })
  })

  // ─── downloadEnvironment ──────────────────────────────────────────────────

  describe('downloadEnvironment', () => {
    it('should return environment content', async () => {
      const session = createMockSession({ envid: 'env-123' })
      sessionService.findById.mockResolvedValue(session as any)
      sandboxService.downloadEnvironment.mockResolvedValue({ envid: 'env-123', content: 'binary-data' } as any)

      const user = createUserEntity()
      const result = await service.downloadEnvironment('session-test-id', user as any)

      expect(sessionService.findById).toHaveBeenCalledWith('session-test-id', { parent: true, activity: true })
      expect(result.envid).toBe('env-123')
    })

    it('should throw NotFoundResponse when session does not exist', async () => {
      sessionService.findById.mockResolvedValue(null)

      const user = createUserEntity()
      await expect(service.downloadEnvironment('non-existent', user as any)).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('should throw NotFoundResponse when session has no envid', async () => {
      const session = createMockSession({ envid: null })
      sessionService.findById.mockResolvedValue(session as any)

      const user = createUserEntity()
      await expect(service.downloadEnvironment('session-test-id', user as any)).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  // ─── playActivity ─────────────────────────────────────────────────────────

  describe('playActivity', () => {
    it('should return existing activity session when one already exists', async () => {
      const activity = createMockActivityEntity()
      const activitySession = createMockActivitySession({ activity })
      sessionService.findUserActivity.mockResolvedValue(activitySession as any)
      activityService.updateActivitiesDates.mockResolvedValue({ start: undefined, end: undefined })

      const user = createUserEntity()
      const result = await service.playActivity('activity-test-id', user as any)

      expect(sessionService.findUserActivity).toHaveBeenCalledWith('activity-test-id', user.id)
      expect(activityService.findByIdForUser).not.toHaveBeenCalled()
      expect(result.activity).toBeDefined()
    })

    it('should create a new session when none exists', async () => {
      const activity = createMockActivityEntity()
      const activitySession = createMockActivitySession({ activity })

      sessionService.findUserActivity.mockResolvedValue(null)
      activityService.findByIdForUser.mockResolvedValue(activity as any)
      sessionService.create.mockResolvedValue(activitySession as any)
      sessionService.update.mockResolvedValue(undefined)
      activityService.updateActivitiesDates.mockResolvedValue({ start: undefined, end: undefined })

      const user = createUserEntity()
      const result = await service.playActivity('activity-test-id', user as any)

      expect(activityService.findByIdForUser).toHaveBeenCalledWith('activity-test-id', user)
      expect(sessionService.create).toHaveBeenCalled()
      expect(result.activity).toBeDefined()
    })

    it('should skip date restriction check when ignoreRestrictions is true', async () => {
      const activity = createMockActivityEntity({ ignoreRestrictions: true })
      const activitySession = createMockActivitySession({ activity })
      sessionService.findUserActivity.mockResolvedValue(activitySession as any)

      const user = createUserEntity()
      await service.playActivity('activity-test-id', user as any)

      expect(activityService.updateActivitiesDates).not.toHaveBeenCalled()
    })

    it('should call updateActivitiesDates when ignoreRestrictions is false', async () => {
      const activity = createMockActivityEntity({ ignoreRestrictions: false })
      const activitySession = createMockActivitySession({ activity })
      sessionService.findUserActivity.mockResolvedValue(activitySession as any)
      activityService.updateActivitiesDates.mockResolvedValue({ start: undefined, end: undefined })

      const user = createUserEntity()
      await service.playActivity('activity-test-id', user as any)

      expect(activityService.updateActivitiesDates).toHaveBeenCalledWith([activity])
    })
  })

  // ─── playExercises ────────────────────────────────────────────────────────

  describe('playExercises', () => {
    it('should throw NotFoundResponse when activity session does not exist', async () => {
      sessionService.findById.mockResolvedValue(null)

      const user = createUserEntity()
      await expect(
        service.playExercises('missing-activity-session', ['exercise-session-1'], user as any)
      ).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('should throw NotFoundResponse when activity is missing on the session', async () => {
      const activitySession = createMockActivitySession({ activity: null })
      sessionService.findById.mockResolvedValue(activitySession as any)

      const user = createUserEntity()
      await expect(
        service.playExercises('activity-session-id', ['exercise-session-1'], user as any)
      ).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('should build exercise when not yet built and return exercise players', async () => {
      const activity = createMockActivityEntity({ ignoreRestrictions: true })
      const activitySession = createMockActivitySession({ activity })
      const exerciseSession = createMockSession({ id: 'exercise-session-1', isBuilt: false })

      sessionService.findById.mockResolvedValue(activitySession as any)
      sessionService.findExerciseSessionByActivityId.mockResolvedValue(exerciseSession as any)
      sandboxService.build.mockResolvedValue({ envid: 'env-id', variables: { seed: 42 } } as any)
      sessionService.update.mockResolvedValue(undefined)

      const user = createUserEntity()
      const result = await service.playExercises('activity-session-id', ['exercise-session-1'], user as any)

      expect(sandboxService.build).toHaveBeenCalled()
      expect(result.exercises).toHaveLength(1)
    })

    it('should skip build when exercise is already built', async () => {
      const activity = createMockActivityEntity({ ignoreRestrictions: true })
      const activitySession = createMockActivitySession({ activity })
      const exerciseSession = createMockSession({ id: 'exercise-session-1', isBuilt: true })

      sessionService.findById.mockResolvedValue(activitySession as any)
      sessionService.findExerciseSessionByActivityId.mockResolvedValue(exerciseSession as any)
      sessionService.update.mockResolvedValue(undefined)

      const user = createUserEntity()
      const result = await service.playExercises('activity-session-id', ['exercise-session-1'], user as any)

      expect(sandboxService.build).not.toHaveBeenCalled()
      expect(result.exercises).toHaveLength(1)
    })
  })

  // ─── playNext ─────────────────────────────────────────────────────────────

  describe('playNext', () => {
    it('should throw NotFoundResponse when activity session does not exist', async () => {
      sessionService.findById.mockResolvedValue(null)

      const user = createUserEntity()
      await expect(service.playNext('missing-id', user as any)).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('should throw ForbiddenResponse when activity is not yet opened', async () => {
      const futureDate = new Date(Date.now() + 60_000)
      const activitySession = createMockActivitySession({
        activity: createMockActivityEntity({ openAt: futureDate, ignoreRestrictions: false }),
      })
      sessionService.findById.mockResolvedValue(activitySession as any)

      const user = createUserEntity()
      await expect(service.playNext('activity-session-id', user as any)).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('should throw ForbiddenResponse when activity is closed', async () => {
      const pastDate = new Date(Date.now() - 60_000)
      const activitySession = createMockActivitySession({
        activity: createMockActivityEntity({ closeAt: pastDate, ignoreRestrictions: false }),
      })
      sessionService.findById.mockResolvedValue(activitySession as any)

      const user = createUserEntity()
      await expect(service.playNext('activity-session-id', user as any)).rejects.toBeInstanceOf(ForbiddenResponse)
    })

    it('should return next exercise info on success', async () => {
      const activitySession = createMockActivitySession({
        activity: createMockActivityEntity({ openAt: null, closeAt: null }),
        variables: {
          navigation: {
            started: true,
            terminated: false,
            exercises: [],
            nextExercisesHistory: [],
            nextExercisesHistoryPosition: -1,
          },
          settings: {},
          exerciseGroups: {},
          seed: 42,
        },
      })
      sessionService.findById.mockResolvedValue(activitySession as any)
      sessionService.findAllWithParent.mockResolvedValue([])
      sandboxService.buildNext.mockResolvedValue({
        envid: 'env-id',
        variables: {
          nextExerciseId: 'next-exercise-id',
          navigation: { exercises: [], nextExercisesHistory: [], nextExercisesHistoryPosition: -1 },
          activityGrade: 0,
          savedVariables: {},
          generatedExercises: {},
          exercisesHistory: [],
          exerciseGroups: {},
        },
      } as any)
      sessionService.update.mockResolvedValue(undefined)

      const user = createUserEntity()
      const result = await service.playNext('activity-session-id', user as any)

      expect(sandboxService.buildNext).toHaveBeenCalled()
      expect(result.nextExerciseId).toBe('next-exercise-id')
    })
  })

  // ─── onReloadActivity ─────────────────────────────────────────────────────

  describe('onReloadActivity', () => {
    it('should start a transaction to delete sessions and corrections for the activity', async () => {
      const sessions = [
        { id: 'session-1', correctionId: 'correction-1' },
        { id: 'session-2', correctionId: null },
      ]
      mockEntityManager.find.mockResolvedValue(sessions)

      const activity = createMockActivityEntity()
      await (service as any).onReloadActivity({ activity })

      expect(dataSource.transaction).toHaveBeenCalled()
      expect(mockEntityManager.find).toHaveBeenCalled()
      expect(mockEntityManager.delete).toHaveBeenCalledTimes(2)
    })

    it('should not crash when there are no sessions to delete', async () => {
      mockEntityManager.find.mockResolvedValue([])

      const activity = createMockActivityEntity()
      await expect((service as any).onReloadActivity({ activity })).resolves.not.toThrow()
    })
  })
})

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing'
import { PlayerController } from './player.controller'
import { PlayerService } from './player.service'
import { IRequest } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { createUserEntity } from '@platon/core/testing/server'
import { PlayActivityInputDTO, PlayExerciseInputDTO, PreviewInputDTO } from './player.dto'
import { EvalExerciseInput, PlayerActions } from '@platon/feature/player/common'
import { createMockExercisePlayer, createMockActivityPlayer } from './factories/player.factory'

describe('PlayerController', () => {
  let controller: PlayerController
  let service: jest.Mocked<PlayerService>

  const mockUser = createUserEntity({ role: UserRoles.teacher })
  const mockReq = { user: mockUser } as unknown as IRequest

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [
        {
          provide: PlayerService,
          useValue: {
            preview: jest.fn(),
            answers: jest.fn(),
            playActivity: jest.fn(),
            playExercises: jest.fn(),
            playNext: jest.fn(),
            terminate: jest.fn(),
            evaluate: jest.fn(),
            saveTemporaryAnswer: jest.fn(),
            downloadEnvironment: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(PlayerController)
    service = module.get(PlayerService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── preview ──────────────────────────────────────────────────────────────

  describe('POST /player/preview', () => {
    it('should return preview output from service', async () => {
      const exercisePlayer = createMockExercisePlayer()
      service.preview.mockResolvedValue({ exercise: exercisePlayer as any })

      const input: PreviewInputDTO = { version: 'main', resource: 'resource-id' }
      const result = await controller.preview(mockReq, input)

      expect(service.preview).toHaveBeenCalledWith(input, mockUser)
      expect(result.exercise).toBeDefined()
    })
  })

  // ─── playAnswers ──────────────────────────────────────────────────────────

  describe('POST /player/play/answers', () => {
    it('should return exercise players for a session', async () => {
      const players = [createMockExercisePlayer(), createMockExercisePlayer()]
      service.answers.mockResolvedValue(players as any)

      const result = await controller.playAnswers({ sessionId: 'session-test-id' })

      expect(service.answers).toHaveBeenCalledWith('session-test-id')
      expect(result.exercises).toHaveLength(2)
    })
  })

  // ─── playActivity ─────────────────────────────────────────────────────────

  describe('POST /player/play/activity', () => {
    it('should delegate to service with activityId and user', async () => {
      const activityPlayer = createMockActivityPlayer()
      service.playActivity.mockResolvedValue({ activity: activityPlayer as any })

      const input: PlayActivityInputDTO = { activityId: 'activity-test-id' }
      const result = await controller.playActivity(mockReq, input)

      expect(service.playActivity).toHaveBeenCalledWith('activity-test-id', mockUser)
      expect(result.activity).toBeDefined()
    })
  })

  // ─── playExercises ────────────────────────────────────────────────────────

  describe('POST /player/play/exercises', () => {
    it('should return exercise players and navigation', async () => {
      const players = [createMockExercisePlayer()]
      service.playExercises.mockResolvedValue({ exercises: players as any, navigation: undefined })

      const input: PlayExerciseInputDTO = {
        activitySessionId: 'activity-session-id',
        exerciseSessionIds: ['exercise-session-1'],
      }
      const result = await controller.playExercises(mockReq, input)

      expect(service.playExercises).toHaveBeenCalledWith('activity-session-id', ['exercise-session-1'], mockUser)
      expect(result.exercises).toHaveLength(1)
    })
  })

  // ─── next ─────────────────────────────────────────────────────────────────

  describe('POST /player/next', () => {
    it('should delegate to playNext with activitySessionId and user', async () => {
      service.playNext.mockResolvedValue({
        nextExerciseId: 'next-exercise-id',
        navigation: {} as any,
        logs: undefined,
      })

      const input: PlayExerciseInputDTO = {
        activitySessionId: 'activity-session-id',
        exerciseSessionIds: [],
      }
      const result = await controller.next(mockReq, input)

      expect(service.playNext).toHaveBeenCalledWith('activity-session-id', mockUser)
      expect(result.nextExerciseId).toBe('next-exercise-id')
    })
  })

  // ─── terminate ────────────────────────────────────────────────────────────

  describe('POST /player/terminate/:sessionId', () => {
    it('should terminate the session and return activity output', async () => {
      const activityPlayer = createMockActivityPlayer()
      service.terminate.mockResolvedValue({ activity: activityPlayer as any })

      const result = await controller.terminate(mockReq, 'session-test-id')

      expect(service.terminate).toHaveBeenCalledWith('session-test-id', mockUser)
      expect(result.activity).toBeDefined()
    })
  })

  // ─── evaluate ─────────────────────────────────────────────────────────────

  describe('POST /player/evaluate', () => {
    it('should return exercise player when service returns a single player', async () => {
      const exercisePlayer = createMockExercisePlayer()
      service.evaluate.mockResolvedValue(exercisePlayer as any)

      const input: EvalExerciseInput = {
        action: PlayerActions.CHECK_ANSWER,
        sessionId: 'session-test-id',
        answers: { q1: 'answer' },
      }
      const result = await controller.evaluate(mockReq, input)

      expect(service.evaluate).toHaveBeenCalledWith(input, mockUser)
      expect(result.exercise).toBeDefined()
      expect(result.navigation).toBeUndefined()
    })

    it('should return exercise player and navigation when service returns a tuple', async () => {
      const exercisePlayer = createMockExercisePlayer()
      const navigation = { exercises: [], started: true } as any
      service.evaluate.mockResolvedValue([exercisePlayer, navigation] as any)

      const input: EvalExerciseInput = {
        action: PlayerActions.CHECK_ANSWER,
        sessionId: 'session-test-id',
        answers: {},
      }
      const result = await controller.evaluate(mockReq, input)

      expect(result.exercise).toBeDefined()
      expect(result.navigation).toBeDefined()
    })
  })

  // ─── saveTemporaryAnswer ──────────────────────────────────────────────────

  describe('POST /player/saveTemporaryAnswer', () => {
    it('should call saveTemporaryAnswer on the service', async () => {
      service.saveTemporaryAnswer.mockResolvedValue(undefined as any)

      const input: EvalExerciseInput = {
        action: PlayerActions.SAVE_ANSWER,
        sessionId: 'session-test-id',
        answers: { q1: 'draft' },
      }
      await controller.saveTemporaryAnswer(mockReq, input)

      expect(service.saveTemporaryAnswer).toHaveBeenCalledWith(input, mockUser)
    })
  })
})

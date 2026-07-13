/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const request = require('supertest')
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PlayerController } from './player.controller'
import { PlayerService } from './player.service'
import { PlayerActions } from '@platon/feature/player/common'
import { createMockExercisePlayer, createMockActivityPlayer } from './factories/player.factory'

// Valid v4 UUIDs (version nibble = 4, variant nibble in [8, 9, a, b])
const UUID_SESSION = '123e4567-e89b-42d3-a456-556642440001'
const UUID_ACTIVITY = '123e4567-e89b-42d3-a456-556642440002'
const UUID_ACTIVITY_SESSION = '123e4567-e89b-42d3-a456-556642440003'
const UUID_EXERCISE_SESSION = '123e4567-e89b-42d3-a456-556642440004'
const UUID_TERMINATE = '123e4567-e89b-42d3-a456-556642440005'
const UUID_EVAL = '123e4567-e89b-42d3-a456-556642440006'

let app: INestApplication
let service: jest.Mocked<PlayerService>

const http = () => request(app.getHttpServer())

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
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

  app = moduleRef.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
  await app.init()

  service = moduleRef.get(PlayerService)
})

afterAll(async () => {
  await app.close()
})

afterEach(() => jest.clearAllMocks())

// ─── POST /player/preview ──────────────────────────────────────────────────

describe('POST /player/preview', () => {
  it('should return 201 with exercise player on success', async () => {
    service.preview.mockResolvedValue({ exercise: createMockExercisePlayer() as any })

    const res = await http().post('/player/preview').send({ version: 'main', resource: 'resource-id' }).expect(201)

    expect(res.body.exercise).toBeDefined()
    expect(service.preview).toHaveBeenCalled()
  })

  it('should return 400 when both version and resource are missing', async () => {
    await http().post('/player/preview').send({}).expect(400)
  })

  it('should return 400 when version is missing', async () => {
    await http().post('/player/preview').send({ resource: 'resource-id' }).expect(400)
  })

  it('should return 400 when resource is missing', async () => {
    await http().post('/player/preview').send({ version: 'main' }).expect(400)
  })
})

// ─── POST /player/play/answers ─────────────────────────────────────────────
// Note: uses PlayAnswersInput interface — ValidationPipe ne valide pas le corps

describe('POST /player/play/answers', () => {
  it('should return 201 with exercise players on success', async () => {
    service.answers.mockResolvedValue([createMockExercisePlayer()] as any)

    const res = await http().post('/player/play/answers').send({ sessionId: UUID_SESSION }).expect(201)

    expect(service.answers).toHaveBeenCalledWith(UUID_SESSION)
    expect(res.body.exercises).toHaveLength(1)
  })

  it('should return 201 and propagate empty result', async () => {
    service.answers.mockResolvedValue([])

    const res = await http().post('/player/play/answers').send({ sessionId: UUID_SESSION }).expect(201)

    expect(res.body.exercises).toHaveLength(0)
  })
})

// ─── POST /player/play/activity ────────────────────────────────────────────

describe('POST /player/play/activity', () => {
  it('should return 201 with activity player on success', async () => {
    service.playActivity.mockResolvedValue({ activity: createMockActivityPlayer() as any })

    const res = await http().post('/player/play/activity').send({ activityId: UUID_ACTIVITY }).expect(201)

    expect(service.playActivity).toHaveBeenCalled()
    expect(res.body.activity).toBeDefined()
  })

  it('should return 400 when activityId is not a valid UUID', async () => {
    await http().post('/player/play/activity').send({ activityId: 'not-a-uuid' }).expect(400)
  })

  it('should return 400 when activityId is missing', async () => {
    await http().post('/player/play/activity').send({}).expect(400)
  })
})

// ─── POST /player/play/exercises ───────────────────────────────────────────

describe('POST /player/play/exercises', () => {
  it('should return 201 with exercise players on success', async () => {
    service.playExercises.mockResolvedValue({ exercises: [createMockExercisePlayer()] as any })

    const res = await http()
      .post('/player/play/exercises')
      .send({
        activitySessionId: UUID_ACTIVITY_SESSION,
        exerciseSessionIds: [UUID_EXERCISE_SESSION],
      })
      .expect(201)

    expect(service.playExercises).toHaveBeenCalledWith(UUID_ACTIVITY_SESSION, [UUID_EXERCISE_SESSION], undefined)
    expect(res.body.exercises).toHaveLength(1)
  })

  it('should return 400 when activitySessionId is not a valid UUID', async () => {
    await http()
      .post('/player/play/exercises')
      .send({ activitySessionId: 'bad-uuid', exerciseSessionIds: [] })
      .expect(400)
  })

  it('should return 400 when exerciseSessionIds contains an invalid UUID', async () => {
    await http()
      .post('/player/play/exercises')
      .send({
        activitySessionId: UUID_ACTIVITY_SESSION,
        exerciseSessionIds: ['not-a-uuid'],
      })
      .expect(400)
  })

  it('should return 400 when activitySessionId is missing', async () => {
    await http()
      .post('/player/play/exercises')
      .send({ exerciseSessionIds: [UUID_EXERCISE_SESSION] })
      .expect(400)
  })
})

// ─── POST /player/next ─────────────────────────────────────────────────────

describe('POST /player/next', () => {
  it('should return 201 with next exercise info', async () => {
    service.playNext.mockResolvedValue({
      nextExerciseId: 'next-id',
      navigation: {} as any,
      logs: undefined,
    })

    const res = await http()
      .post('/player/next')
      .send({
        activitySessionId: UUID_ACTIVITY_SESSION,
        exerciseSessionIds: [],
      })
      .expect(201)

    expect(service.playNext).toHaveBeenCalledWith(UUID_ACTIVITY_SESSION, undefined)
    expect(res.body.nextExerciseId).toBe('next-id')
  })

  it('should return 400 when activitySessionId is not a valid UUID', async () => {
    await http().post('/player/next').send({ activitySessionId: 'bad-uuid', exerciseSessionIds: [] }).expect(400)
  })
})

// ─── POST /player/terminate/:sessionId ────────────────────────────────────

describe('POST /player/terminate/:sessionId', () => {
  it('should return 201 with activity output', async () => {
    service.terminate.mockResolvedValue({ activity: createMockActivityPlayer() as any })

    const res = await http().post(`/player/terminate/${UUID_TERMINATE}`).expect(201)

    expect(service.terminate).toHaveBeenCalledWith(UUID_TERMINATE, undefined)
    expect(res.body.activity).toBeDefined()
  })

  it('should return 400 when sessionId is not a valid UUID', async () => {
    await http().post('/player/terminate/not-a-uuid').expect(400)
  })
})

// ─── POST /player/evaluate ─────────────────────────────────────────────────
// Note: uses EvalExerciseInput interface — ValidationPipe ne valide pas le corps

describe('POST /player/evaluate', () => {
  it('should return 201 with exercise player when service returns a single player', async () => {
    service.evaluate.mockResolvedValue(createMockExercisePlayer() as any)

    const res = await http()
      .post('/player/evaluate')
      .send({ action: PlayerActions.CHECK_ANSWER, sessionId: UUID_EVAL, answers: {} })
      .expect(201)

    expect(res.body.exercise).toBeDefined()
    expect(res.body.navigation).toBeUndefined()
  })

  it('should return 201 with navigation when service returns a tuple', async () => {
    const navigation = { exercises: [], started: true }
    service.evaluate.mockResolvedValue([createMockExercisePlayer(), navigation] as any)

    const res = await http()
      .post('/player/evaluate')
      .send({ action: PlayerActions.CHECK_ANSWER, sessionId: UUID_EVAL, answers: {} })
      .expect(201)

    expect(res.body.exercise).toBeDefined()
    expect(res.body.navigation).toBeDefined()
  })
})

// ─── POST /player/saveTemporaryAnswer ──────────────────────────────────────
// Note: uses EvalExerciseInput interface — ValidationPipe ne valide pas le corps

describe('POST /player/saveTemporaryAnswer', () => {
  it('should return 201 and call the service', async () => {
    service.saveTemporaryAnswer.mockResolvedValue(undefined as any)

    await http()
      .post('/player/saveTemporaryAnswer')
      .send({ action: PlayerActions.SAVE_ANSWER, sessionId: UUID_EVAL, answers: { q1: 'draft' } })
      .expect(201)

    expect(service.saveTemporaryAnswer).toHaveBeenCalled()
  })
})

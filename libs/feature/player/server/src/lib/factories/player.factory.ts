import { createUserEntity } from '@platon/core/testing/server'

export const createMockSource = (overrides: Record<string, unknown> = {}) => ({
  abspath: '/test/exercise.ple',
  variables: { seed: 42 },
  dependencies: [],
  ...overrides,
})

export const createMockActivitySource = (overrides: Record<string, unknown> = {}) =>
  createMockSource({
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
    ...overrides,
  })

export const createMockSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-test-id',
  userId: 'user-test-id',
  activityId: 'activity-test-id',
  activity: null,
  parent: null,
  variables: {
    navigation: {
      started: false,
      terminated: false,
      exercises: [],
      nextExercisesHistory: [],
      nextExercisesHistoryPosition: -1,
    },
    settings: {},
    exerciseGroups: {},
    seed: 42,
  },
  isBuilt: true,
  envid: 'env-test-id',
  source: createMockSource(),
  startedAt: null,
  attempts: 0,
  grade: -1,
  succeededAt: null,
  correctionId: null,
  hasId: jest.fn().mockReturnValue(true),
  save: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  softRemove: jest.fn().mockResolvedValue(undefined),
  recover: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

export const createMockActivitySession = (overrides: Record<string, unknown> = {}) =>
  createMockSession({
    id: 'activity-session-id',
    source: createMockActivitySource(),
    variables: {
      navigation: {
        started: false,
        terminated: false,
        exercises: [],
        nextExercisesHistory: [],
        nextExercisesHistoryPosition: -1,
        current: null,
      },
      settings: {},
      exerciseGroups: {},
      seed: 42,
    },
    ...overrides,
  })

export const createMockActivityEntity = (overrides: Record<string, unknown> = {}) => ({
  id: 'activity-test-id',
  ignoreRestrictions: true,
  openAt: null,
  closeAt: null,
  source: createMockActivitySource(),
  creator: createUserEntity(),
  hasId: jest.fn().mockReturnValue(true),
  save: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  softRemove: jest.fn().mockResolvedValue(undefined),
  recover: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

export const createMockAnswer = (overrides: Record<string, unknown> = {}) => ({
  id: 'answer-test-id',
  grade: 100,
  sessionId: 'session-test-id',
  userId: 'user-test-id',
  variables: {},
  createdAt: new Date('2026-01-01'),
  ...overrides,
})

export const createMockExercisePlayer = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 'session-test-id',
  form: {},
  ...overrides,
})

export const createMockActivityPlayer = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 'activity-session-id',
  navigation: {
    started: false,
    terminated: false,
    exercises: [],
    nextExercisesHistory: [],
    nextExercisesHistoryPosition: -1,
  },
  ...overrides,
})

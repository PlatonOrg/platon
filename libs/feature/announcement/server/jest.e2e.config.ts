export default {
  displayName: 'feature-announcement-server-e2e',
  preset: '../../../../jest.preset.js',
  testMatch: ['**/*.e2e.spec.ts'],
  testTimeout: 60_000,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.e2e.json',
      },
    ],
  },
  coverageDirectory: '../../../../coverage/libs/feature/announcement/server/e2e',
}

/* eslint-disable */
export default {
  displayName: 'feature-announcement-server-integration',
  preset: '../../../../jest.preset.js',
  testMatch: ['**/*.integration.spec.ts'],
  testTimeout: 60_000,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.integration.json',
      },
    ],
  },
  coverageDirectory: '../../../../coverage/libs/feature/announcement/server/integration',
}

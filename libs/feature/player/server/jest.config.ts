/* eslint-disable */
export default {
  displayName: 'feature-player-server',
  preset: '../../../../jest.preset.js',
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$', '\\.e2e\\.spec\\.ts$'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/feature/player/server',
}

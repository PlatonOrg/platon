module.exports = {
  displayName: 'feature-notification-server',
  preset: '../../../../jest.preset.js',
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$', '\\.e2e\\.spec\\.ts$'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    '^.+\\.js$': [
      '@swc/jest',
      {
        jsc: { target: 'es2022', parser: { syntax: 'ecmascript' } },
        module: { type: 'commonjs' },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/feature/notification/server',
}

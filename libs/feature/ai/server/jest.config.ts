module.exports = {
  displayName: 'feature-ai-server',
  preset: '../../../../jest.preset.js',
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
  coverageDirectory: '../../../../coverage/libs/feature/ai/server',
}

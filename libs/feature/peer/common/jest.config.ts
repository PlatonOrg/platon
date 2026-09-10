module.exports = {
  displayName: 'feature-peer-common',
  preset: '../../../../jest.preset.js',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    '^.+\\.jsx?$': [
      '@swc/jest',
      {
        jsc: { target: 'es2022', parser: { syntax: 'ecmascript' } },
        module: { type: 'commonjs' },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/feature/peer/common',
}

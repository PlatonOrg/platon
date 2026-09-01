import baseConfig from '../../eslint.config.mjs'
import jsoncEslintParser from 'jsonc-eslint-parser'

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parserOptions: {
        project: ['tools/cli/tsconfig.*?.json'],
      },
    },
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: jsoncEslintParser,
    },
    rules: {
      '@nx/dependency-checks': 'error',
    },
  },
  {
    files: ['package.json', 'generators.json'],
    languageOptions: {
      parser: jsoncEslintParser,
    },
    rules: {
      '@nx/nx-plugin-checks': 'error',
    },
  },
]

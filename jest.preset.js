const nxPreset = require('@nx/jest/preset').default

module.exports = {
  ...nxPreset,
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|echarts|zrender|@angular|ng-zorro-antd|@nestjs)'],
  // Sans collectCoverageFrom, Jest n'instrumente que les fichiers importés par un test qui s'exécute :
  // un fichier jamais testé n'apparaît pas du tout dans le rapport au lieu de compter comme 0%.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
    '!src/test-setup.ts',
    '!src/environments/**',
  ],
}

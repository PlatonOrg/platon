# Guide des tests — Platon (Server)

Ce guide explique comment configurer et écrire les tests unitaires, d'intégration et E2E pour une feature server.
Référence : `libs/feature/announcement/server/`.

---

## Structure des fichiers

Pour une feature `libs/feature/<nom>/server/`, voici les fichiers à créer :

```
libs/feature/<nom>/server/
├── jest.config.ts                   # Config tests unitaires
├── jest.integration.config.ts       # Config tests intégration
├── jest.e2e.config.ts               # Config tests E2E
├── tsconfig.json                    # Référence les 3 tsconfig de test
├── tsconfig.spec.json               # TS pour tests unitaires
├── tsconfig.integration.json        # TS pour tests intégration
├── tsconfig.e2e.json                # TS pour tests E2E
├── project.json                     # Targets Nx (test, test:integration, test:e2e)
└── src/lib/
    ├── <nom>.service.spec.ts              # Tests unitaires service
    ├── <nom>.controller.spec.ts           # Tests unitaires controller
    ├── <nom>.service.integration.spec.ts  # Tests intégration
    └── <nom>.controller.e2e.spec.ts       # Tests E2E
```

---

## 1. Configuration

### project.json — Targets Nx

```json
{
  "targets": {
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "libs/feature/<nom>/server/jest.config.ts"
      }
    },
    "test:integration": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}/integration"],
      "options": {
        "jestConfig": "libs/feature/<nom>/server/jest.integration.config.ts",
        "passWithNoTests": false
      }
    },
    "test:e2e": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}/e2e"],
      "options": {
        "jestConfig": "libs/feature/<nom>/server/jest.e2e.config.ts",
        "passWithNoTests": false
      }
    },
    "test:all": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "nx run feature-<nom>-server:test",
          "nx run feature-<nom>-server:test:integration",
          "nx run feature-<nom>-server:test:e2e"
        ],
        "parallel": false
      }
    }
  }
}
```

### Jest configs

**jest.config.ts** (unitaires) — exclut les integration et e2e :

```ts
export default {
  displayName: 'feature-<nom>-server',
  preset: '../../../../jest.preset.js',
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$', '\\.e2e\\.spec\\.ts$'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/feature/<nom>/server',
}
```

**jest.integration.config.ts** :

```ts
export default {
  displayName: 'feature-<nom>-server-integration',
  preset: '../../../../jest.preset.js',
  testMatch: ['**/*.integration.spec.ts'],
  testTimeout: 60_000,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.integration.json' }],
  },
  coverageDirectory: '../../../../coverage/libs/feature/<nom>/server/integration',
}
```

**jest.e2e.config.ts** :

```ts
export default {
  displayName: 'feature-<nom>-server-e2e',
  preset: '../../../../jest.preset.js',
  testMatch: ['**/*.e2e.spec.ts'],
  testTimeout: 60_000,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.e2e.json' }],
  },
  coverageDirectory: '../../../../coverage/libs/feature/<nom>/server/e2e',
}
```

### TypeScript configs

**tsconfig.json** — référencer les 4 configs :

```json
{
  "extends": "../../../../tsconfig.base.json",
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" },
    { "path": "./tsconfig.integration.json" },
    { "path": "./tsconfig.e2e.json" }
  ]
}
```

**tsconfig.spec.json** (unitaires) :

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../../dist/out-tsc",
    "module": "commonjs",
    "target": "es2016",
    "types": ["jest", "node"]
  },
  "include": ["jest.config.ts", "src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

**tsconfig.integration.json** — ajoute les decorators (requis par TypeORM) :

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../../dist/out-tsc",
    "module": "commonjs",
    "target": "es2016",
    "types": ["jest", "node"],
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["jest.integration.config.ts", "src/**/*.integration.spec.ts", "src/**/*.d.ts"]
}
```

**tsconfig.e2e.json** :

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2016",
    "types": ["jest", "node"],
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["jest.e2e.config.ts", "src/**/*.e2e.spec.ts"]
}
```

> `emitDecoratorMetadata` et `experimentalDecorators` sont obligatoires pour les tests intégration et E2E car TypeORM et NestJS utilisent les decorators pour le DI et le mapping des entités.

---

## 2. Utilitaires disponibles

Tout est importé depuis `@platon/core/testing/server`.

### Tests unitaires

| Utilitaire | Usage |
|---|---|
| `mockRepository<T>()` | Crée un mock de `Repository<T>` avec `find`, `findOne`, `save`, `create`, `update`, `delete`, `createQueryBuilder` |
| `mockSelectQueryBuilder<T>()` | Crée un mock de `SelectQueryBuilder` avec les méthodes chaînables (`where`, `andWhere`, `leftJoinAndSelect`...) |
| `createUserEntity(overrides?)` | Factory qui retourne un `UserEntity` avec des valeurs par défaut |

### Tests intégration

| Utilitaire | Usage |
|---|---|
| `createTestDatabase(entities)` | Démarre un container PostgreSQL réel via testcontainers. Retourne `{ dataSource, container, teardown }` |

### Tests E2E

| Utilitaire | Usage |
|---|---|
| `createE2EApp(options)` | Crée une app NestJS complète avec base de données, auth, guards. Retourne `{ app, db, createUser, getRepository }` |

---

## 3. Écrire les tests

### Tests unitaires — `*.spec.ts`

Tout est mocké. On teste la logique métier en isolation.

```ts
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { mockRepository, MockRepository } from '@platon/core/testing/server'
import { MonEntity } from './mon.entity'
import { MonService } from './mon.service'

describe('MonService', () => {
  let service: MonService
  let repository: MockRepository<MonEntity>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MonService,
        { provide: getRepositoryToken(MonEntity), useValue: mockRepository<MonEntity>() },
      ],
    }).compile()

    service = module.get(MonService)
    repository = module.get(getRepositoryToken(MonEntity))
  })

  it('should create', async () => {
    const entity = { id: '1', name: 'test' }
    repository.create.mockReturnValue(entity)
    repository.save.mockResolvedValue(entity)

    const result = await service.create({ name: 'test' })
    expect(result).toEqual(entity)
  })
})
```

### Tests intégration — `*.integration.spec.ts`

Vraie base PostgreSQL, pas de NestJS app. On instancie le service directement avec le vrai repository.

```ts
import { UserEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { MonEntity } from './mon.entity'
import { MonService } from './mon.service'

describe('MonService (integration)', () => {
  let testDb: TestDatabase
  let service: MonService

  beforeAll(async () => {
    testDb = await createTestDatabase([UserEntity, MonEntity])
    const repo = testDb.dataSource.getRepository(MonEntity)
    service = new MonService(repo)
  }, 60_000)

  afterAll(() => testDb.teardown())

  afterEach(async () => {
    await testDb.dataSource.query('TRUNCATE TABLE "MaTable" CASCADE')
  })

  it('should persist and return entity', async () => {
    const result = await service.create({ name: 'test' })
    expect(result.id).toBeDefined()
  })
})
```

> Inclure `UserEntity` dans les entités si votre entity a une FK vers `Users`.

### Tests E2E — `*.e2e.spec.ts`

Pipeline HTTP complet avec auth réelle. `createE2EApp` gère tout le boilerplate.

```ts
import { UserRoles } from '@platon/core/common'
import { createE2EApp, E2EContext, TestUser } from '@platon/core/testing/server'
const request = require('supertest')
import { MonEntity } from './mon.entity'
import { MonService } from './mon.service'
import { MonController } from './mon.controller'

let ctx: E2EContext
let admin: TestUser

const http = () => request(ctx.app.getHttpServer())
const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

beforeAll(async () => {
  ctx = await createE2EApp({
    entities: [MonEntity],
    controllers: [MonController],
    providers: [MonService],
  })
  admin = await ctx.createUser({ username: 'admin-e2e', role: UserRoles.admin })
}, 60_000)

afterAll(async () => {
  await ctx.app.close()
  await ctx.db.teardown()
})

afterEach(async () => {
  await ctx.getRepository(MonEntity).query('TRUNCATE "MaTable" CASCADE')
})

it('should return 401 without token', async () => {
  await http().get('/ma-route').expect(401)
})

it('should return 200 with admin token', async () => {
  await http().get('/ma-route').set(auth(admin.token)).expect(200)
})
```

`createE2EApp` s'occupe de :
- Démarrer le container PostgreSQL
- Configurer TypeORM avec les entités auth + vos entités
- Enregistrer `TestAuthModule` (AuthGuard, RolesGuard, JwtStrategy, UserService)
- Créer l'app NestJS avec `ValidationPipe`

Vous n'avez pas besoin d'importer `JwtService`, `UserEntity`, `TypeOrmModule`, ou `TestAuthModule`.

---

## 4. Commandes

```bash
# Un projet spécifique
nx run feature-<nom>-server:test              # Unitaires
nx run feature-<nom>-server:test:integration  # Intégration
nx run feature-<nom>-server:test:e2e          # E2E
nx run feature-<nom>-server:test:all          # Les 3

# Tous les projets affectés (ce que fait le CI)
yarn affected:lint --parallel --base=develop
yarn affected:test --parallel --base=develop
yarn affected:test:integration --base=develop
yarn affected:test:e2e --base=develop
yarn affected:build --parallel --base=develop
```

---

## 5. Conventions de nommage

| Type | Fichier | Pattern Jest |
|---|---|---|
| Unitaire | `*.spec.ts` | Exclu par les autres configs via `testPathIgnorePatterns` |
| Intégration | `*.integration.spec.ts` | Matché par `testMatch: ['**/*.integration.spec.ts']` |
| E2E | `*.e2e.spec.ts` | Matché par `testMatch: ['**/*.e2e.spec.ts']` |

Les conventions de nommage sont ce qui permet à chaque config Jest de cibler les bons fichiers. Ne pas les changer.

import { INestApplication, Type, ValidationPipe } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { UserEntity as UserEntityType } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { EntityTarget, ObjectLiteral, Repository } from 'typeorm'
import { createTestDatabase, TestDatabase } from '../database/test-database'
import { createAuthenticatedUser, getAuthEntities, TestAuthModule, TestUser } from './test-auth.module'

export interface CreateE2EAppOptions {
  /** Entités spécifiques à la feature (les entités auth sont ajoutées automatiquement). */
  entities: EntityTarget<ObjectLiteral>[]
  /** Controllers à enregistrer dans le module de test. */
  controllers: Type[]
  /** Providers à enregistrer dans le module de test. */
  providers: Type[]
  /** Imports NestJS supplémentaires (ex: TypeOrmModule.forFeature pour des entités custom). */
  imports?: Parameters<typeof Test.createTestingModule>[0]['imports']
}

export interface E2EContext {
  /** L'application NestJS initialisée avec ValidationPipe. */
  app: INestApplication
  /** La base de données de test (container + dataSource + teardown). */
  db: TestDatabase
  /**
   * Crée un utilisateur authentifié en base et retourne son entité + JWT.
   */
  createUser: (overrides: Partial<UserEntityType> & { username: string; role: UserRoles }) => Promise<TestUser>
  /** Raccourci pour obtenir un repository TypeORM depuis le dataSource de test. */
  getRepository: <T extends ObjectLiteral>(entity: EntityTarget<T>) => Repository<T>
}

/**
 * Initialise une application E2E complète avec authentification réelle et base PostgreSQL.
 *
 * Factorise tout le boilerplate : database, TypeORM, TestAuthModule, ValidationPipe, création d'utilisateurs.
 *
 * @example
 * ```ts
 * let ctx: E2EContext
 *
 * beforeAll(async () => {
 *   ctx = await createE2EApp({
 *     entities: [AnnouncementEntity],
 *     controllers: [AnnouncementController],
 *     providers: [AnnouncementService],
 *   })
 *   admin = await ctx.createUser({ username: 'admin-e2e', role: UserRoles.admin })
 *   announcementRepo = ctx.getRepository(AnnouncementEntity)
 * }, 60_000)
 *
 * afterAll(async () => {
 *   await ctx.app.close()
 *   await ctx.db.teardown()
 * })
 * ```
 */
export const createE2EApp = async (options: CreateE2EAppOptions): Promise<E2EContext> => {
  const authEntities = await getAuthEntities()
  const allEntities = [...authEntities, ...options.entities]

  const db = await createTestDatabase(allEntities)

  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: db.container.getHost(),
        port: db.container.getFirstMappedPort(), // getMappedPort(5432),
        database: db.container.getDatabase(),
        username: db.container.getUsername(),
        password: db.container.getPassword(),
        entities: allEntities as never[],
        synchronize: true,
      }),
      TypeOrmModule.forFeature(options.entities as Type[]),
      await TestAuthModule.register(),
      ...(options.imports ?? []),
    ],
    controllers: options.controllers,
    providers: options.providers,
  }).compile()

  const app = moduleRef.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
  await app.init()

  const jwtService = moduleRef.get(JwtService)
  const { UserEntity } = await import('@platon/core/server')
  const userRepo = db.dataSource.getRepository(UserEntity)

  const createUser = (overrides: Partial<UserEntityType> & { username: string; role: UserRoles }) =>
    createAuthenticatedUser(jwtService, userRepo, overrides)

  const getRepository = <T extends ObjectLiteral>(entity: EntityTarget<T>) => db.dataSource.getRepository(entity)

  return { app, db, createUser, getRepository }
}

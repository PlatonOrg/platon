import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { AuthGuard, JwtStrategy, RolesGuard, UserService, UserEntity } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { Repository } from 'typeorm'

const JWT_SECRET = 'e2e-test-secret'

/**
 * Entités requises pour l'authentification dans les tests E2E.
 * À inclure dans le `TypeOrmModule.forRoot({ entities: [...AUTH_ENTITIES, ...vosEntités] })`.
 */
export const getAuthEntities = async () => {
  const { UserPrefsEntity, UserGroupEntity, UserCharterEntity, LevelEntity, TopicEntity } = await import(
    '@platon/core/server'
  )
  return [UserEntity, UserPrefsEntity, UserGroupEntity, UserCharterEntity, LevelEntity, TopicEntity]
}

/**
 * Module NestJS réutilisable qui fournit l'authentification réelle pour les tests E2E.
 *
 * Fournit : ConfigModule, JwtModule, AuthGuard, RolesGuard, JwtStrategy, UserService.
 *
 * @example
 * ```ts
 * const entities = [...(await getAuthEntities()), AnnouncementEntity]
 * const db = await createTestDatabase(entities)
 *
 * const moduleRef = await Test.createTestingModule({
 *   imports: [
 *     TypeOrmModule.forRoot({ ...dbConfig, entities, synchronize: true }),
 *     TypeOrmModule.forFeature([AnnouncementEntity]),
 *     TestAuthModule.register(),
 *   ],
 *   controllers: [AnnouncementController],
 *   providers: [AnnouncementService],
 * }).compile()
 * ```
 */
@Module({})
export class TestAuthModule {
  static register(): DynamicModule {
    return {
      module: TestAuthModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              secret: JWT_SECRET,
              auth: { accessLifetime: '15m', refreshLifetime: '7d', salt: 10 },
            }),
          ],
        }),
        JwtModule.register({ secret: JWT_SECRET, global: true }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature([UserEntity]),
      ],
      providers: [
        UserService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
      exports: [JwtModule, UserService],
    }
  }
}

export interface TestUser {
  user: UserEntity
  token: string
}

/**
 * Crée un utilisateur en base et signe un vrai JWT pour lui.
 *
 * @example
 * ```ts
 * const admin = await createAuthenticatedUser(jwtService, userRepo, {
 *   username: 'admin-e2e',
 *   role: UserRoles.admin,
 * })
 * await request(app.getHttpServer())
 *   .get('/announcements')
 *   .set('Authorization', `Bearer ${admin.token}`)
 *   .expect(200)
 * ```
 */
export const createAuthenticatedUser = async (
  jwtService: JwtService,
  userRepo: Repository<UserEntity>,
  overrides: Partial<UserEntity> & { username: string; role: UserRoles }
): Promise<TestUser> => {
  const user = await userRepo.save(
    userRepo.create({
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    })
  )

  const token = await jwtService.signAsync({ sub: user.id, username: user.username }, { secret: JWT_SECRET })

  return { user, token }
}

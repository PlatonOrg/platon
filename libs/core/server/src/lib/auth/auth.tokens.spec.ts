import { Controller, Get, INestApplication, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { UserService } from '../users/user.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import type { IRequest } from './auth.types'
import { Public } from './decorators/public.decorator'
import { AuthGuard } from './guards/auth.guard'
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'

const request = require('supertest')

const SECRET = 'auth-tokens-spec-secret'

@Controller('test')
class TestController {
  @Get('protected')
  protected(@Req() req: IRequest) {
    return { username: req.user.username }
  }

  @Public()
  @Get('public')
  public(@Req() req: IRequest) {
    return { username: req.user?.username ?? null }
  }
}

/**
 * Exercises the access/refresh token separation through HTTP, with real tokens, strategies and guards.
 */
describe('Access and refresh tokens', () => {
  const user = createUserEntity({ id: 'user-1', username: 'testuser' })
  const jwt = new JwtService({ secret: SECRET })

  let app: INestApplication
  let authService: AuthService

  const http = () => request(app.getHttpServer())
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET })],
      controllers: [AuthController, TestController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtRefreshStrategy,
        { provide: APP_GUARD, useClass: AuthGuard },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            secret: SECRET,
            auth: { accessLifetime: '15m', refreshLifetime: '7d', salt: 10 },
          }),
        },
        {
          provide: UserService,
          useValue: {
            findByIdOrName: jest.fn(async (id: string) => (id === user.id ? Optional.of(user) : Optional.empty())),
            updateLastActivity: jest.fn().mockResolvedValue(undefined),
            touchLastLogin: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
    authService = moduleRef.get(AuthService)
  })

  afterAll(async () => {
    await app.close()
  })

  it('devrait émettre deux tokens distincts, même avec des durées de vie identiques', async () => {
    const service = new AuthService(
      jwt,
      { touchLastLogin: jest.fn().mockResolvedValue(undefined) } as unknown as UserService,
      new ConfigService({ secret: SECRET, auth: { accessLifetime: '7d', refreshLifetime: '7d' } })
    )

    const { accessToken, refreshToken } = await service.authenticate(user.id, user.username)

    expect(accessToken).not.toBe(refreshToken)
    expect(jwt.decode(accessToken).type).toBe('access')
    expect(jwt.decode(refreshToken).type).toBe('refresh')
  })

  describe('route protégée', () => {
    it("devrait accepter un token d'accès", async () => {
      const { accessToken } = await authService.authenticate(user.id, user.username)

      await http().get('/test/protected').set(bearer(accessToken)).expect(200, { username: 'testuser' })
    })

    it('devrait refuser un refresh token', async () => {
      const { refreshToken } = await authService.authenticate(user.id, user.username)

      await http().get('/test/protected').set(bearer(refreshToken)).expect(401)
    })

    it('devrait traiter un refresh token comme une requête anonyme sur une route publique', async () => {
      const { refreshToken } = await authService.authenticate(user.id, user.username)

      await http().get('/test/public').set(bearer(refreshToken)).expect(200, { username: null })
    })
  })

  describe('POST /auth/refresh', () => {
    it("devrait refuser un token d'accès", async () => {
      const { accessToken } = await authService.authenticate(user.id, user.username)

      await http().post('/auth/refresh').set(bearer(accessToken)).expect(401)
    })

    it('devrait refuser une requête sans token', async () => {
      await http().post('/auth/refresh').expect(401)
    })

    it('devrait refuser un refresh token expiré sans demander de rafraîchissement (pas de TOKEN_EXPIRED)', async () => {
      const expired = jwt.sign(
        { sub: user.id, username: user.username, type: 'refresh', exp: Math.floor(Date.now() / 1000) - 60 },
        { secret: SECRET }
      )

      const response = await http().post('/auth/refresh').set(bearer(expired)).expect(401)

      expect(JSON.stringify(response.body)).not.toContain('TOKEN_EXPIRED')
    })

    it("devrait émettre un token d'accès utilisable à partir d'un refresh token", async () => {
      const { refreshToken } = await authService.authenticate(user.id, user.username)

      const response = await http().post('/auth/refresh').set(bearer(refreshToken)).expect(201)

      const { accessToken, refreshToken: returnedRefreshToken } = response.body.resource
      expect(returnedRefreshToken).toBe(refreshToken)
      await http().get('/test/protected').set(bearer(accessToken)).expect(200, { username: 'testuser' })
      await http().post('/auth/refresh').set(bearer(accessToken)).expect(401)
    })
  })

  describe('transition des tokens émis sans claim type', () => {
    const legacyToken = () => jwt.sign({ sub: user.id, username: user.username }, { secret: SECRET, expiresIn: '1h' })

    it('devrait les accepter sur une route protégée', async () => {
      await http().get('/test/protected').set(bearer(legacyToken())).expect(200)
    })

    it('devrait les accepter sur /auth/refresh sans prolonger la session au-delà de leur expiration', async () => {
      const legacy = legacyToken()

      const response = await http().post('/auth/refresh').set(bearer(legacy)).expect(201)

      const { accessToken } = response.body.resource
      expect(jwt.decode(accessToken).exp).toBeLessThanOrEqual(jwt.decode(legacy).exp)
    })
  })
})

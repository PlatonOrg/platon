import { HttpErrorResponse, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { AuthToken, TOKEN_EXPIRED_ERROR_CODE } from '@platon/core/common'
import { firstValueFrom, of, throwError } from 'rxjs'
import { TokenService } from '../api/token.service'
import { AuthInterceptor } from './auth.interceptor'

const tokenExpiredError = () =>
  new HttpErrorResponse({ status: 401, error: { statusCode: 401, message: TOKEN_EXPIRED_ERROR_CODE } })

describe('AuthInterceptor', () => {
  const token: AuthToken = { accessToken: 'access', refreshToken: 'refresh' }

  let interceptor: AuthInterceptor
  let tokenService: { token: jest.Mock; refresh: jest.Mock }
  let authorizations: (string | null)[]

  /** Rejects every request with an expired token error, except those using `validToken`. */
  const handlerAccepting = (validToken: string | null): HttpHandler => ({
    handle: (req) => {
      const authorization = req.headers.get('Authorization')
      authorizations.push(authorization)
      return authorization === validToken ? of(new HttpResponse({ status: 200 })) : throwError(tokenExpiredError)
    },
  })

  beforeEach(() => {
    tokenService = { token: jest.fn().mockResolvedValue(token), refresh: jest.fn() }
    TestBed.configureTestingModule({
      providers: [AuthInterceptor, { provide: TokenService, useValue: tokenService }],
    })
    interceptor = TestBed.inject(AuthInterceptor)
    authorizations = []
  })

  it('devrait rejouer la requête avec le token rafraîchi', async () => {
    tokenService.refresh.mockResolvedValue({ ...token, accessToken: 'refreshed' })

    await firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/api'), handlerAccepting('Bearer refreshed')))

    expect(authorizations).toEqual(['Bearer access', 'Bearer refreshed'])
  })

  it('devrait rejouer la requête sans token si le rafraîchissement échoue', async () => {
    tokenService.refresh.mockRejectedValue(new Error('auth/refresh-token-expired'))

    await firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/api'), handlerAccepting(null)))

    expect(authorizations).toEqual(['Bearer access', null])
  })

  it('devrait rejouer les requêtes en attente une fois le rafraîchissement terminé', async () => {
    let resolveRefresh!: (token: AuthToken) => void
    tokenService.refresh.mockReturnValue(new Promise((resolve) => (resolveRefresh = resolve)))
    const next = handlerAccepting('Bearer refreshed')

    const first = firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/first'), next))
    const second = firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/second'), next))
    await Promise.resolve()
    resolveRefresh({ ...token, accessToken: 'refreshed' })

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(authorizations.filter((authorization) => authorization === 'Bearer refreshed')).toHaveLength(2)
  })
})

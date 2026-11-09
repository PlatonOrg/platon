import { HttpErrorResponse, HttpHandler, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { AuthToken, TOKEN_EXPIRED_ERROR_CODE } from '@platon/core/common'
import { firstValueFrom, of, throwError } from 'rxjs'
import { TokenService } from '../api/token.service'
import { AuthGuard } from '../guards/auth.guard'
import { AuthInterceptor } from './auth.interceptor'

const tokenExpiredError = () =>
  new HttpErrorResponse({ status: 401, error: { statusCode: 401, message: TOKEN_EXPIRED_ERROR_CODE } })

describe('AuthInterceptor', () => {
  const token: AuthToken = { accessToken: 'access', refreshToken: 'refresh' }

  let interceptor: AuthInterceptor
  let tokenService: { token: jest.Mock; refresh: jest.Mock }
  let authGuard: { redirectIfProtected: jest.Mock }
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
    authGuard = { redirectIfProtected: jest.fn().mockResolvedValue(undefined) }
    TestBed.configureTestingModule({
      providers: [
        AuthInterceptor,
        { provide: TokenService, useValue: tokenService },
        { provide: AuthGuard, useValue: authGuard },
      ],
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

  describe('fin de session', () => {
    it("devrait demander la redirection si le rafraîchissement a mis fin à la session, sans l'attendre", async () => {
      // A guard may be waiting for this very request: waiting for the navigation here would never end.
      authGuard.redirectIfProtected.mockReturnValue(new Promise(() => undefined))
      tokenService.token.mockResolvedValueOnce(token).mockResolvedValue(undefined)
      tokenService.refresh.mockRejectedValue(new Error('auth/refresh-token-expired'))

      await firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/api'), handlerAccepting(null)))

      expect(authGuard.redirectIfProtected).toHaveBeenCalledTimes(1)
      expect(authorizations).toEqual(['Bearer access', null])
    })

    it('ne devrait pas demander la redirection si la session est conservée (erreur réseau)', async () => {
      tokenService.refresh.mockRejectedValue(new HttpErrorResponse({ status: 0 }))

      await firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/api'), handlerAccepting(null)))

      expect(authGuard.redirectIfProtected).not.toHaveBeenCalled()
    })

    it('ne devrait pas demander la redirection si le rafraîchissement réussit', async () => {
      tokenService.refresh.mockResolvedValue({ ...token, accessToken: 'refreshed' })

      await firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/api'), handlerAccepting('Bearer refreshed')))

      expect(authGuard.redirectIfProtected).not.toHaveBeenCalled()
    })
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

  it('ne devrait jamais envoyer le refresh token, même aux requêtes émises pendant un rafraîchissement', async () => {
    let resolveRefresh!: (token: AuthToken) => void
    tokenService.refresh.mockReturnValue(new Promise((resolve) => (resolveRefresh = resolve)))
    const next = handlerAccepting('Bearer refreshed')

    const first = firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/first'), next))
    await new Promise((resolve) => setTimeout(resolve))
    expect(tokenService.refresh).toHaveBeenCalledTimes(1)

    // Sent while the refresh is in progress: waits for the new access token instead of being sent.
    const second = firstValueFrom(interceptor.intercept(new HttpRequest('GET', '/second'), next))
    await new Promise((resolve) => setTimeout(resolve))
    expect(authorizations).toEqual(['Bearer access'])

    resolveRefresh({ ...token, accessToken: 'refreshed' })

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(authorizations).toEqual(['Bearer access', 'Bearer refreshed', 'Bearer refreshed'])
    expect(authorizations).not.toContain('Bearer refresh')
  })

  it('devrait laisser intactes les requêtes qui définissent leur propre en-tête Authorization', async () => {
    const req = new HttpRequest(
      'POST',
      '/api/v1/auth/refresh/',
      {},
      { headers: new HttpHeaders({ Authorization: 'Bearer refresh' }) }
    )

    await expect(firstValueFrom(interceptor.intercept(req, handlerAccepting(null)))).rejects.toBeInstanceOf(
      HttpErrorResponse
    )

    expect(authorizations).toEqual(['Bearer refresh'])
    expect(tokenService.token).not.toHaveBeenCalled()
    expect(tokenService.refresh).not.toHaveBeenCalled()
  })
})

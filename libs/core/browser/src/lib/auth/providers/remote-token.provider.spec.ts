import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { AuthToken } from '@platon/core/common'
import { of } from 'rxjs'
import { StorageService } from '../../services'
import { RemoteTokenProvider } from './remote-token.provider'

/** Builds an unsigned JWT: only its payload is read by the client. */
const jwt = (payload: Record<string, unknown>): string => {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600

describe('RemoteTokenProvider', () => {
  let provider: RemoteTokenProvider
  let http: HttpTestingController
  let storage: { get: jest.Mock; set: jest.Mock; remove: jest.Mock }

  const useStoredToken = (token: AuthToken) => storage.get.mockReturnValue(of(token))

  beforeEach(() => {
    storage = {
      get: jest.fn().mockReturnValue(of(undefined)),
      set: jest.fn().mockReturnValue(of(undefined)),
      remove: jest.fn().mockReturnValue(of(undefined)),
    }
    TestBed.configureTestingModule({
      providers: [
        RemoteTokenProvider,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storage },
      ],
    })
    provider = TestBed.inject(RemoteTokenProvider)
    http = TestBed.inject(HttpTestingController)
    localStorage.clear()
  })

  afterEach(() => http.verify())

  describe('refresh', () => {
    it("devrait envoyer le refresh token, et seulement lui, à l'appel de rafraîchissement", async () => {
      const refreshToken = jwt({ sub: 'user-1', type: 'refresh', exp: inOneHour() })
      useStoredToken({ accessToken: 'expired-access', refreshToken })

      const result = provider.refresh()
      await new Promise((resolve) => setTimeout(resolve))

      const req = http.expectOne('/api/v1/auth/refresh/')
      expect(req.request.method).toBe('POST')
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${refreshToken}`)
      req.flush({ resource: { accessToken: 'new-access', refreshToken } })

      await expect(result).resolves.toEqual({ accessToken: 'new-access', refreshToken })
    })

    it('devrait enregistrer la paire de tokens renvoyée par le serveur', async () => {
      const refreshToken = jwt({ sub: 'user-1', type: 'refresh', exp: inOneHour() })
      const renewedRefreshToken = jwt({ sub: 'user-1', type: 'refresh', exp: inOneHour() + 60 })
      useStoredToken({ accessToken: 'expired-access', refreshToken })

      const result = provider.refresh()
      await new Promise((resolve) => setTimeout(resolve))
      http
        .expectOne('/api/v1/auth/refresh/')
        .flush({ resource: { accessToken: 'new-access', refreshToken: renewedRefreshToken } })
      await result

      const expected = { accessToken: 'new-access', refreshToken: renewedRefreshToken }
      expect(storage.set).toHaveBeenCalledWith('auth-token', expected)
      expect(JSON.parse(localStorage.getItem('auth-token') as string)).toEqual(expected)
    })

    it('devrait supprimer la session sans appeler le serveur si le refresh token est expiré', async () => {
      const refreshToken = jwt({ sub: 'user-1', type: 'refresh', exp: Math.floor(Date.now() / 1000) - 60 })
      useStoredToken({ accessToken: 'expired-access', refreshToken })

      await expect(provider.refresh()).rejects.toThrow('auth/refresh-token-expired')

      expect(storage.remove).toHaveBeenCalledWith('auth-token')
      http.expectNone('/api/v1/auth/refresh/')
    })

    it('devrait supprimer la session si le serveur refuse le refresh token', async () => {
      const refreshToken = jwt({ sub: 'user-1', type: 'refresh', exp: inOneHour() })
      useStoredToken({ accessToken: 'expired-access', refreshToken })

      const result = provider.refresh()
      await new Promise((resolve) => setTimeout(resolve))
      http.expectOne('/api/v1/auth/refresh/').flush({}, { status: 401, statusText: 'Unauthorized' })

      await expect(result).rejects.toBeInstanceOf(HttpErrorResponse)
      expect(storage.remove).toHaveBeenCalledWith('auth-token')
    })

    it.each([
      ['une erreur serveur', 500],
      ['une coupure réseau', 0],
    ])('devrait conserver la session après %s', async (_label, status) => {
      const refreshToken = jwt({ sub: 'user-1', type: 'refresh', exp: inOneHour() })
      useStoredToken({ accessToken: 'expired-access', refreshToken })

      const result = provider.refresh()
      await new Promise((resolve) => setTimeout(resolve))
      http.expectOne('/api/v1/auth/refresh/').flush({}, { status, statusText: 'Error' })

      await expect(result).rejects.toBeInstanceOf(HttpErrorResponse)
      expect(storage.remove).not.toHaveBeenCalled()
    })

    it("devrait échouer s'il n'y a pas de session", async () => {
      await expect(provider.refresh()).rejects.toThrow('auth/no-token')
    })
  })
})

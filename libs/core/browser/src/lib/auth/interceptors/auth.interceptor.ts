/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http'
import { Injectable, Injector, inject } from '@angular/core'
import { AuthToken, ErrorResponse, TOKEN_EXPIRED_ERROR_CODE } from '@platon/core/common'

import { BehaviorSubject, from, Observable, throwError } from 'rxjs'
import { catchError, filter, finalize, switchMap, take, tap } from 'rxjs/operators'
import { TokenService } from '../api/token.service'
import { AuthGuard } from '../guards/auth.guard'

/**
 * Intercepts http request to add Authorization header with logged user json web token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly injector = inject(Injector)
  private readonly tokenService = inject(TokenService)

  private isRefreshing = false
  /** `undefined` while refreshing, `null` if the refresh failed. */
  private readonly token$ = new BehaviorSubject<AuthToken | null | undefined>(undefined)

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Requests that set their own credentials are sent as is. This is the case of the refresh request,
    // which is the only one to send the refresh token (see `RemoteTokenProvider.refresh`).
    if (req.headers.has('Authorization')) {
      return next.handle(req)
    }

    // Requests sent while a refresh is in progress wait for the new access token.
    if (this.isRefreshing) {
      return this.refreshToken(req, next)
    }

    return from(this.tokenService.token()).pipe(
      switchMap((token) => {
        if (token != null) {
          return next.handle(this.addAuthorization(req, token.accessToken)).pipe(
            catchError<any, any>((err) => {
              if (err instanceof HttpErrorResponse) {
                const error = err.error as ErrorResponse
                if (error && error.statusCode === 401 && error.message === TOKEN_EXPIRED_ERROR_CODE) {
                  return this.refreshToken(req, next)
                }
              }
              return throwError(() => err)
            })
          )
        }
        return next.handle(req)
      })
    )
  }

  private refreshToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true

      // future requests will wait until the refresh token is resolved
      this.token$.next(undefined)

      return from(this.tokenService.refresh()).pipe(
        // The session cannot be refreshed: the request is retried anonymously, so public routes still work.
        catchError(() => from(this.onRefreshFailed())),
        tap((token) => this.token$.next(token)),
        switchMap((token) => this.retry(req, next, token)),
        finalize(() => (this.isRefreshing = false))
      )
    }

    return this.token$.pipe(
      filter((token) => token !== undefined),
      take(1),
      switchMap((token) => this.retry(req, next, token))
    )
  }

  private async onRefreshFailed(): Promise<null> {
    // The token is only kept after a failure that does not end the session, such as a network error.
    if (!(await this.tokenService.token())) {
      // Not awaited: a route guard may be waiting for the response of this request to finish the navigation.
      // Resolved here rather than injected, for the router not to be created along with the first request.
      this.injector.get(AuthGuard).redirectIfProtected().catch(console.error)
    }
    return null
  }

  private retry(
    req: HttpRequest<any>,
    next: HttpHandler,
    token: AuthToken | null | undefined
  ): Observable<HttpEvent<any>> {
    return next.handle(token ? this.addAuthorization(req, token.accessToken) : req)
  }

  private addAuthorization(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token),
    })
  }
}

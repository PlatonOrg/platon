/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { AuthToken, ErrorResponse, TOKEN_EXPIRED_ERROR_CODE } from '@platon/core/common'

import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs'
import { catchError, filter, finalize, switchMap, take, tap } from 'rxjs/operators'
import { TokenService } from '../api/token.service'

/**
 * Intercepts http request to add Authorization header with logged user json web token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenService = inject(TokenService)

  private isRefreshing = false
  /** `undefined` while refreshing, `null` if the refresh failed. */
  private readonly token$ = new BehaviorSubject<AuthToken | null | undefined>(undefined)

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.tokenService.token()).pipe(
      switchMap((token) => {
        if (token != null) {
          return next
            .handle(this.addAuthorization(req, this.isRefreshing ? token.refreshToken : token.accessToken))
            .pipe(
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
        catchError(() => of(null)),
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

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http'
import { Injectable } from '@angular/core'
import { AuthToken, ErrorResponse, TOKEN_EXPIRED_ERROR_CODE } from '@platon/core/common'

import { BehaviorSubject, from, Observable, throwError } from 'rxjs'
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators'
import { TokenService } from '../api/token.service'

/**
 * Intercepts http request to add Authorization header with logged user json web token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false
  private readonly token$ = new BehaviorSubject<AuthToken | undefined>(undefined)

  constructor(private readonly tokenService: TokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.tokenService.token()).pipe(
      switchMap((token) => {
        if (token != null) {
          return next
            .handle(
              this.addAuthorization(req, this.isRefreshing ? token.refreshToken : token.accessToken)
            )
            .pipe(
              catchError<any, any>((err) => {
                if (err instanceof HttpErrorResponse) {
                  const error = err.error as ErrorResponse
                  if (
                    error &&
                    error.statusCode === 401 &&
                    error.message === TOKEN_EXPIRED_ERROR_CODE
                  ) {
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
        switchMap((token) => {
          return next.handle(this.addAuthorization(req, token!.accessToken))
        }),
        finalize(() => (this.isRefreshing = false))
      )
    }

    return this.token$.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((token) => {
        return next.handle(this.addAuthorization(req, token!.accessToken))
      })
    )
  }

  private addAuthorization(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token),
    })
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql'
import { AuthGuard as PassportGuard } from '@nestjs/passport'
import { IS_REFRESH_TOKEN_AUTH_KEY } from '../decorators/refresh-token-auth.decorator'
import { MemoizedPromise, TOKEN_EXPIRED_ERROR_CODE, UnauthorizedResponse, User } from '@platon/core/common'
import { TokenExpiredError } from 'jsonwebtoken'
import { firstValueFrom, Observable } from 'rxjs'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { AuthExecutionContext, IRequest } from '../auth.types'

const isTokenExpiredError = (error: unknown): boolean =>
  error instanceof UnauthorizedResponse && error.message === TOKEN_EXPIRED_ERROR_CODE

@Injectable()
export class AuthGuard extends PassportGuard(['jwt']) {
  constructor(private reflector: Reflector) {
    super()
  }

  override getRequest(context: ExecutionContext) {
    if (context.getType<GqlContextType>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<AuthExecutionContext>()
      const { req, connection } = gqlContext
      return connection && connection.context && connection.context.headers ? connection.context : req
    }
    return context.switchToHttp().getRequest()
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Routes authenticated with a refresh token are handled by `JwtRefreshGuard` (see `@RefreshTokenAuth()`).
    if (
      this.reflector.getAllAndOverride<boolean>(IS_REFRESH_TOKEN_AUTH_KEY, [context.getHandler(), context.getClass()])
    ) {
      return true
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    try {
      const request = this.getRequest(context) as IRequest
      request.memoize = async <TResult>(key: string, fn: () => Promise<TResult>) => {
        const memoized = (request[key] as MemoizedPromise<TResult>) ?? new MemoizedPromise(fn)
        if (!request[key]) {
          request[key] = memoized
        }
        return memoized.execute()
      }

      const loggedIn = super.canActivate(new ExecutionContextHost([request]))

      if (typeof loggedIn === 'boolean') {
        return isPublic || loggedIn
      }

      // loggedIn should be called first for promise and observables to trigger the authentication so
      // public routes can also access user information in case of a valid token

      if (loggedIn instanceof Observable) {
        return (await firstValueFrom(loggedIn)) || isPublic
      }

      return (await loggedIn) || isPublic
    } catch (error) {
      // An expired token is rejected even on public routes so that the client refreshes it,
      // instead of the request being silently handled as anonymous.
      if (isPublic && !isTokenExpiredError(error)) {
        return true
      }
      throw error
    }
  }

  override handleRequest(err: any, user: User, info: any, context: ExecutionContext, status: any) {
    if (
      info instanceof TokenExpiredError ||
      (Array.isArray(info) && info.some((i) => i instanceof TokenExpiredError))
    ) {
      throw new UnauthorizedResponse(TOKEN_EXPIRED_ERROR_CODE)
    }
    return super.handleRequest(err, user, info, context, status)
  }
}

import { Injectable } from '@nestjs/common'
import { AuthGuard as PassportGuard } from '@nestjs/passport'
import { JWT_REFRESH_STRATEGY } from '../strategies/jwt-refresh.strategy'

/**
 * Requires a valid refresh token. An expired or invalid token is rejected with a plain 401
 * (never `TOKEN_EXPIRED`), so that clients do not try to refresh the refresh token.
 *
 * Applied with the `@RefreshTokenAuth()` decorator.
 */
@Injectable()
export class JwtRefreshGuard extends PassportGuard(JWT_REFRESH_STRATEGY) {
  // An explicit constructor prevents Nest from injecting the optional `AuthModuleOptions` of the parent class.
  constructor() {
    super()
  }
}

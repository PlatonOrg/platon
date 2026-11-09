import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard'

export const IS_REFRESH_TOKEN_AUTH_KEY = 'isRefreshTokenAuth'

/**
 * Authenticates the route with a refresh token instead of an access token.
 * The global `AuthGuard` skips these routes and `JwtRefreshGuard` authenticates them.
 */
export const RefreshTokenAuth = () =>
  applyDecorators(SetMetadata(IS_REFRESH_TOKEN_AUTH_KEY, true), UseGuards(JwtRefreshGuard))

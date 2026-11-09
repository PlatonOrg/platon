/**
 * Kind of a JWT issued by `AuthService`.
 * - `access`: sent as Bearer token to every protected route.
 * - `refresh`: only accepted by `POST /auth/refresh` to obtain a new access token.
 */
export type JwtTokenType = 'access' | 'refresh'

export interface JwtPayload {
  sub: string
  username: string
  /**
   * Kind of the token. Missing on tokens issued before access and refresh tokens were distinguished.
   */
  type?: JwtTokenType
  /** Issued at, in seconds since the epoch (set by `jsonwebtoken`). */
  iat?: number
  /** Expiration, in seconds since the epoch (set by `jsonwebtoken`). */
  exp?: number
}

/**
 * Tells whether a token can be used where a token of type `expected` is required.
 *
 * Transition: tokens issued before the `type` claim existed (legacy tokens) are accepted as both kinds,
 * so that users are not signed out when this check is deployed. This is safe because `AuthService.refresh`
 * never issues tokens that outlive the refresh token it receives: a legacy token cannot be used to extend a
 * session beyond its own expiration. Every legacy token is expired once `auth.refreshLifetime` has elapsed
 * after the deployment, after which the legacy branch can be removed.
 */
export const isTokenOfType = (payload: JwtPayload, expected: JwtTokenType): boolean =>
  payload.type === undefined || payload.type === expected

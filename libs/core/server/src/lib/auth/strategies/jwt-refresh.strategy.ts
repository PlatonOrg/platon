import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Configuration } from '../../config/configuration'
import { UserEntity } from '../../users/user.entity'
import { UserService } from '../../users/user.service'
import { isTokenOfType, JwtPayload } from './jwt-payload'

export const JWT_REFRESH_STRATEGY = 'jwt-refresh'

/**
 * Authenticates requests bearing a refresh token. Access tokens are rejected.
 * Only used by the routes decorated with `@RefreshTokenAuth()`.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, JWT_REFRESH_STRATEGY) {
  constructor(private readonly userService: UserService, configService: ConfigService<Configuration>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('secret', { infer: true }),
    })
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    if (!isTokenOfType(payload, 'refresh')) {
      throw new UnauthorizedException('A refresh token is required')
    }

    return (await this.userService.findByIdOrName(payload.sub)).orElseThrow(
      () => new UnauthorizedException(`Failed to authentificate user: ${payload.sub}`)
    )
  }
}

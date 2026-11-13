import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Configuration } from '../../config/configuration'
import { UserEntity } from '../../users/user.entity'
import { UserService } from '../../users/user.service'
import { isTokenOfType, JwtPayload } from './jwt-payload'

/**
 * Authenticates requests bearing an access token. Refresh tokens are rejected.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userService: UserService, configService: ConfigService<Configuration>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('secret', { infer: true }),
    })
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    if (!isTokenOfType(payload, 'access')) {
      throw new UnauthorizedException('An access token is required')
    }

    const user = (await this.userService.findByIdOrName(payload.sub)).orElseThrow(
      () => new UnauthorizedException(`Failed to authentificate user: ${payload.sub}`)
    )
    await this.userService.updateLastActivity(user)
    return user
  }
}

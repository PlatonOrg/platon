import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import {
  AuthToken,
  CreateCandidateAccountInput,
  ForbiddenResponse,
  NotFoundResponse,
  ResetPasswordInput,
  SignInDemoOutput,
  SignInInput,
  SignUpInput,
} from '@platon/core/common'
import * as bcrypt from 'bcrypt'
import { Configuration } from '../config/configuration'
import { UserService } from '../users/user.service'
import { UserRoles } from '@platon/core/common'
import { randomUUID } from 'crypto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService<Configuration>
  ) {}

  async signIn(input: SignInInput): Promise<AuthToken> {
    const optionalUser = await this.userService.findByIdOrName(input.username)
    const user = optionalUser.orElseThrow(() => new NotFoundResponse(`User not found: ${input.username}`))
    if (!user.password || !(await bcrypt.compare(input.password, user.password))) {
      throw new BadRequestException('Password is incorrect')
    }

    return this.authenticate(user.id, user.username)
  }

  async signUp(input: SignUpInput): Promise<AuthToken> {
    const optionalUser = await this.userService.findByIdOrName(input.username)
    if (optionalUser.isPresent()) {
      throw new BadRequestException(`User already found: ${input.username}`)
    }

    const user = await this.userService.create({
      ...input,
      password: await this.hash(input.password),
    })

    return this.authenticate(user.id, user.username)
  }

  async signInDemo(): Promise<SignInDemoOutput> {
    const anonymousUser = await this.userService.create({
      username: 'demo.' + randomUUID().split('-').join('_'),
      firstName: 'anon',
      lastName: 'ymous',
      active: true,
      role: UserRoles.demo,
    })

    const token = await this.authenticate(anonymousUser.id, anonymousUser.username)

    return {
      authToken: token,
      userId: anonymousUser.id,
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<AuthToken> {
    const user = (await this.userService.findByUsername(input.username)).get()
    if (user.password && !(await bcrypt.compare(input.password || '', user.password))) {
      throw new ForbiddenResponse('Password is incorrect')
    }
    if (input.newPassword === input.password) {
      throw new BadRequestException('New password must be different from the old one')
    }
    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?([^\w\s]|_)).{12,}$/
    if (!passwordRegex.test(input.newPassword.trim())) {
      throw new BadRequestException('Invalid password format')
    }
    user.password = await this.hash(input.newPassword.trim())
    await this.userService.update(input.username, user)
    return this.authenticate(user.id, user.username)
  }

  async authenticate(userId: string, username: string): Promise<AuthToken> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get('secret', { infer: true }),
          expiresIn: this.configService.get('auth.accessLifetime', { infer: true }),
        }
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get('secret', { infer: true }),
          expiresIn: this.configService.get('auth.refreshLifetime', { infer: true }),
        }
      ),
    ])
    // Intentionally not blocking authentication if login tracking fails
    this.userService.touchLastLogin(userId).catch((error) => {
      this.logger.error('Failed to update last login:', error)
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  private async hash(data: string): Promise<string> {
    return bcrypt.hash(data, this.configService.get('auth.salt', { infer: true }) as number)
  }

  async createCandidateAccount(input: CreateCandidateAccountInput): Promise<string> {
    const user = await this.userService.create({
      username: 'candidat.' + randomUUID().split('-').join('_'),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      active: true,
      role: UserRoles.candidate,
    })
    return user.id
  }
}

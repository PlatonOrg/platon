import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { Configuration } from '../../config/configuration'
import { UserService } from '../../users/user.service'
import { JwtRefreshStrategy } from './jwt-refresh.strategy'

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy
  let userService: jest.Mocked<UserService>

  beforeEach(() => {
    userService = {
      findByIdOrName: jest.fn(),
      updateLastActivity: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserService>
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService<Configuration>
    strategy = new JwtRefreshStrategy(userService, configService)
  })

  it("devrait retourner l'utilisateur si le refresh token est valide", async () => {
    const user = createUserEntity({ id: 'user-1', username: 'testuser' })
    userService.findByIdOrName.mockResolvedValue(Optional.of(user))

    const result = await strategy.validate({ sub: 'user-1', username: 'testuser', type: 'refresh' })

    expect(userService.findByIdOrName).toHaveBeenCalledWith('user-1')
    expect(result).toBe(user)
  })

  it("devrait rejeter un token d'accès avec UnauthorizedException", async () => {
    userService.findByIdOrName.mockResolvedValue(Optional.of(createUserEntity({ id: 'user-1' })))

    await expect(strategy.validate({ sub: 'user-1', username: 'testuser', type: 'access' })).rejects.toThrow(
      UnauthorizedException
    )
    expect(userService.findByIdOrName).not.toHaveBeenCalled()
  })

  it("devrait rejeter avec UnauthorizedException si l'utilisateur du token n'existe plus", async () => {
    userService.findByIdOrName.mockResolvedValue(Optional.empty())

    await expect(strategy.validate({ sub: 'unknown', username: 'ghost', type: 'refresh' })).rejects.toThrow(
      UnauthorizedException
    )
  })

  it("devrait accepter un token émis avant l'ajout du claim type (transition)", async () => {
    const user = createUserEntity({ id: 'user-1', username: 'testuser' })
    userService.findByIdOrName.mockResolvedValue(Optional.of(user))

    await expect(strategy.validate({ sub: 'user-1', username: 'testuser' })).resolves.toBe(user)
  })
})

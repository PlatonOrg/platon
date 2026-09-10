import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createUserEntity } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { JwtStrategy } from './jwt.strategy'
import { UserService } from '../../users/user.service'
import { Configuration } from '../../config/configuration'

describe('JwtStrategy', () => {
  let strategy: JwtStrategy
  let userService: jest.Mocked<UserService>

  beforeEach(() => {
    userService = {
      findByIdOrName: jest.fn(),
      updateLastActivity: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserService>
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService<Configuration>
    strategy = new JwtStrategy(userService, configService)
  })

  it("devrait retourner l'utilisateur et mettre à jour sa dernière activité si le token est valide", async () => {
    const user = createUserEntity({ id: 'user-1', username: 'testuser' })
    userService.findByIdOrName.mockResolvedValue(Optional.of(user))

    const result = await strategy.validate({ sub: 'user-1', username: 'testuser' })

    expect(userService.findByIdOrName).toHaveBeenCalledWith('user-1')
    expect(userService.updateLastActivity).toHaveBeenCalledWith(user)
    expect(result).toBe(user)
  })

  it("devrait rejeter avec UnauthorizedException si l'utilisateur du token n'existe plus", async () => {
    userService.findByIdOrName.mockResolvedValue(Optional.empty())

    await expect(strategy.validate({ sub: 'unknown', username: 'ghost' })).rejects.toThrow(UnauthorizedException)
    expect(userService.updateLastActivity).not.toHaveBeenCalled()
  })
})

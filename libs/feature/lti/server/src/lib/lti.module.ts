import { Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule, UserModule } from '@platon/core/server'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LTIController } from './lti.controller'
import { LtiService } from './lti.service'
import { LTIOldService } from './lti.service.old'
import { LtiPlatformEntity } from './entities/lti-platform.entity'
import { LtiCrypto } from './lti-crypto'
import { RedisLtiEphemeralStore } from './lti-ephemeral.store'
import { Redis } from 'ioredis'
import { Configuration } from '@platon/core/server'
import { ConfigService } from '@nestjs/config'
import { LtiDatabaseManager } from './lti-database.manager'
import { LtiPlatformController } from './lti-platform.controller'
import { LtiPlatformService } from './lti-platform.service'
import { LmsUserService } from './lms-user.service'

const LTI_REDIS = Symbol('LTI_REDIS')
const DEFAULT_REDIS_HOST = 'localhost'
const DEFAULT_REDIS_PORT = 6379

const createRedis = (config: ConfigService<Configuration>): Redis => {
  const logger = new Logger(FeatureLtiServerModule.name)
  const host = config.get<string>('redis.host', { infer: true })
  const port = config.get<number>('redis.port', { infer: true })
  if (!host || !Number.isInteger(port)) {
    logger.warn(
      `REDIS_HOST or REDIS_PORT not set, LTI Redis connecting to ${host || DEFAULT_REDIS_HOST}:${
        Number.isInteger(port) ? port : DEFAULT_REDIS_PORT
      }`
    )
  }
  const redis = new Redis(Number.isInteger(port) ? (port as number) : DEFAULT_REDIS_PORT, host || DEFAULT_REDIS_HOST)
  redis.on('error', (error) => logger.error(`LTI Redis connection error: ${error.message}`))
  return redis
}

@Module({
  imports: [TypeOrmModule.forFeature([LtiPlatformEntity, LmsEntity, LmsUserEntity]), UserModule, AuthModule],
  controllers: [LTIController, LtiPlatformController],
  providers: [
    {
      provide: LtiCrypto,
      useFactory: (config: ConfigService<Configuration>) =>
        new LtiCrypto(config.get<string>('lti.encryptionKey', { infer: true }) ?? ''),
      inject: [ConfigService],
    },
    {
      provide: LTI_REDIS,
      useFactory: (config: ConfigService<Configuration>) => createRedis(config),
      inject: [ConfigService],
    },
    {
      provide: RedisLtiEphemeralStore,
      inject: [LTI_REDIS, LtiCrypto],
      useFactory: (redis: Redis, crypto: LtiCrypto) => new RedisLtiEphemeralStore(redis, crypto),
    },
    LtiDatabaseManager,
    LmsUserService,
    LtiService,
    LtiPlatformService,
    LTIOldService,
  ],
  exports: [LtiService, LTIOldService],
})
export class FeatureLtiServerModule implements OnApplicationShutdown {
  constructor(@Inject(LTI_REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    // quit() waits for pending commands; it fails if the connection is already lost
    await this.redis.quit().catch(() => this.redis.disconnect())
  }
}

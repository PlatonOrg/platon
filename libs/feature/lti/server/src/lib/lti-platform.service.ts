import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { BadRequestResponse, ConflictResponse, NotFoundResponse } from '@platon/core/common'
import { Configuration } from '@platon/core/server'
import { CreateLtiPlatform, LtiToolConfig, UpdateLtiPlatform } from '@platon/feature/lti/common'
import { Platform } from 'ltijs'
import { ILike, Not, Repository } from 'typeorm'
import { LmsEntity } from './entities/lms.entity'
import { LtiPlatformEntity } from './entities/lti-platform.entity'
import { LtiDatabaseManager } from './lti-database.manager'
import { LtiService, LTI_DYNAMIC_REGISTRATION_ENABLED, LTI_ROUTES } from './lti.service'

@Injectable()
export class LtiPlatformService {
  constructor(
    @InjectRepository(LtiPlatformEntity)
    private readonly platformRepo: Repository<LtiPlatformEntity>,
    @InjectRepository(LmsEntity)
    private readonly lmsRepo: Repository<LmsEntity>,
    private readonly databaseManager: LtiDatabaseManager,
    private readonly lti: LtiService,
    private readonly config: ConfigService<Configuration>
  ) {}

  async search(search?: string): Promise<[LtiPlatformEntity[], number]> {
    return this.platformRepo.findAndCount({
      where: search ? [{ name: ILike(`%${search}%`) }, { url: ILike(`%${search}%`) }] : {},
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<LtiPlatformEntity> {
    const platform = await this.platformRepo.findOne({ where: { id } })
    if (!platform) throw new NotFoundResponse(`LTI platform not found: ${id}`)
    return platform
  }

  async create(input: CreateLtiPlatform): Promise<LtiPlatformEntity> {
    const { lmsId, active, ...attributes } = input

    if (lmsId) {
      if (!((await this.lmsRepo.count({ where: { id: lmsId } })) > 0)) {
        throw new BadRequestResponse(`LMS (LTI 1.1) not found: ${lmsId}`)
      }
      if ((await this.platformRepo.count({ where: { id: lmsId } })) > 0) {
        throw new ConflictResponse(`A LTI 1.3 platform already uses the id of LMS: ${lmsId}`)
      }
    }

    if ((await this.platformRepo.count({ where: { url: attributes.url, clientId: attributes.clientId } })) > 0) {
      throw new ConflictResponse('A platform with the same URL and client id already exists')
    }

    const register = () =>
      this.manager.registerPlatform(attributes as unknown as Parameters<typeof this.manager.registerPlatform>[0])
    const platform = await this.validated<Platform>(() =>
      lmsId ? this.databaseManager.runWithPlatformId(lmsId, register) : register()
    )
    if (active === false) await this.manager.deactivatePlatform(platform)
    return this.findById(platform.id)
  }

  async update(id: string, input: UpdateLtiPlatform): Promise<LtiPlatformEntity> {
    const current = await this.findById(id)
    const platform = await this.manager.getPlatformById(id)
    if (!platform) throw new NotFoundResponse(`LTI platform not found: ${id}`)

    const url = input.url ?? current.url
    const clientId = input.clientId ?? current.clientId
    if ((await this.platformRepo.count({ where: { url, clientId, id: Not(id) } })) > 0) {
      throw new ConflictResponse('A platform with the same URL and client id already exists')
    }

    const { active, ...changes } = input
    await this.validated(() =>
      this.manager.updatePlatform(platform, changes as unknown as Parameters<typeof this.manager.updatePlatform>[1])
    )
    if (active !== undefined) {
      await (active ? this.manager.activatePlatform(platform) : this.manager.deactivatePlatform(platform))
    }
    return this.findById(id)
  }

  async delete(id: string): Promise<void> {
    await this.findById(id)
    const platform = await this.manager.getPlatformById(id)
    if (platform) await this.manager.deletePlatform(platform)
  }

  getToolConfig(): LtiToolConfig {
    const base = this.config.get<string>('server.url', { infer: true }) ?? ''
    return {
      loginUrl: `${base}${LTI_ROUTES.login}`,
      launchUrl: `${base}${LTI_ROUTES.launch}`,
      keysetUrl: `${base}${LTI_ROUTES.keyset}`,
      ...(LTI_DYNAMIC_REGISTRATION_ENABLED
        ? { dynamicRegistrationUrl: `${base}${LTI_ROUTES.dynamicRegistration}` }
        : {}),
    }
  }

  private async validated<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') throw new BadRequestResponse(error.message)
      throw error
    }
  }

  private get manager() {
    return this.lti.provider.platformManager
  }
}

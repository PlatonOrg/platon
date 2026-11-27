import { AsyncLocalStorage } from 'node:async_hooks'
import { InjectRepository } from '@nestjs/typeorm'
import {
  AccessTokenRecord,
  DatabaseManager,
  IdTokenClaims,
  PlatformAttributes,
  PlatformFilter,
  PlatformRecord,
} from 'ltijs'
import { FindOptionsSelect, FindOptionsWhere, In, Repository } from 'typeorm'
import { LtiPlatformEntity } from './entities/lti-platform.entity'
import { Injectable, Logger } from '@nestjs/common'
import { isUUID4 } from '@platon/shared/server'
import { RedisLtiEphemeralStore } from './lti-ephemeral.store'
import { LtiCrypto } from './lti-crypto'

const READ_COLUMNS: FindOptionsSelect<LtiPlatformEntity> = {
  id: true,
  name: true,
  url: true,
  clientId: true,
  authenticationEndpoint: true,
  accessTokenEndpoint: true,
  authorizationServer: true,
  idTokenValidation: {
    method: true,
    key: true,
  },
  active: true,
  publicKey: true,
  privateKey: true,
}

/** Forces the id of a platform created through ltijs `registerPlatform` (which does not let you choose it). */
const forcedPlatformId = new AsyncLocalStorage<string>()

@Injectable()
export class LtiDatabaseManager implements DatabaseManager {
  private readonly logger = new Logger(LtiDatabaseManager.name)

  constructor(
    @InjectRepository(LtiPlatformEntity)
    private readonly ltiPlatformRepository: Repository<LtiPlatformEntity>,
    private readonly ephemeralStore: RedisLtiEphemeralStore,
    private readonly crypto: LtiCrypto
  ) {}

  async listen(): Promise<void> {
    try {
      await this.ltiPlatformRepository.count() // Fails early if the table does not exist
    } catch (error) {
      this.logger.error('Error connecting to the database:', error)
      throw error
    }
  }

  close(): Promise<void> {
    return Promise.resolve()
  }

  async getPlatforms(filter?: PlatformFilter): Promise<PlatformRecord[]> {
    const where: FindOptionsWhere<LtiPlatformEntity> = {}
    if (filter?.url !== undefined) where.url = filter.url
    if (filter?.name !== undefined) where.name = filter.name
    if (filter?.clientId !== undefined) {
      where.clientId = Array.isArray(filter.clientId) ? In(filter.clientId) : filter.clientId
    }
    const rows = await this.ltiPlatformRepository.find({ where, select: READ_COLUMNS, order: { createdAt: 'ASC' } })
    return rows.map((row) => this.toRecord(row))
  }

  async getPlatformById(id: string): Promise<PlatformRecord | undefined> {
    if (!isUUID4(id)) {
      this.logger.warn(`Invalid UUID4 format for id: ${id}`)
      return undefined
    }
    const platform = await this.ltiPlatformRepository.findOne({ where: { id }, select: READ_COLUMNS })
    return platform ? this.toRecord(platform) : undefined
  }

  async getPlatformByUrlAndClientId(url: string, clientId: string): Promise<PlatformRecord | undefined> {
    const platform = await this.ltiPlatformRepository.findOne({ where: { url, clientId }, select: READ_COLUMNS })
    return platform ? this.toRecord(platform) : undefined
  }

  runWithPlatformId<T>(id: string, fn: () => Promise<T>): Promise<T> {
    return forcedPlatformId.run(id, fn)
  }

  async savePlatform(platform: PlatformAttributes): Promise<string> {
    const id = forcedPlatformId.getStore()
    const entity = this.ltiPlatformRepository.create({
      ...(id ? { id } : {}),
      name: platform.name,
      url: platform.url,
      clientId: platform.clientId,
      authenticationEndpoint: platform.authenticationEndpoint,
      accessTokenEndpoint: platform.accessTokenEndpoint,
      authorizationServer: platform.authorizationServer ?? null,
      idTokenValidation: platform.idTokenValidation,
      active: platform.active,
      publicKey: platform.keys.public,
      privateKey: this.crypto.encrypt(platform.keys.private), // never stored in plain text
    })
    if (id) {
      // insert (not save): with a forced id, save() would silently overwrite an existing platform
      await this.ltiPlatformRepository.insert(entity)
      return id
    }
    const savedEntity = await this.ltiPlatformRepository.save(entity)
    return savedEntity.id
  }
  async updatePlatformById(id: string, fields: Partial<PlatformAttributes>): Promise<void> {
    if (!isUUID4(id)) {
      this.logger.warn(`Invalid UUID4 format for id: ${id}`)
      return
    }

    const entity = await this.ltiPlatformRepository.findOne({ where: { id }, select: { id: true } })
    if (!entity) {
      this.logger.warn(`Platform with id ${id} not found for update`)
      return
    }

    const { keys, ...columns } = fields
    Object.assign(entity, columns)
    if (keys && keys.public && keys.private) {
      entity.publicKey = keys.public
      entity.privateKey = this.crypto.encrypt(keys.private)
    }

    await this.ltiPlatformRepository.save(entity)
  }

  async deletePlatformById(id: string): Promise<void> {
    if (!isUUID4(id)) {
      this.logger.warn(`Invalid UUID4 format for id: ${id}`)
      return
    }
    const deleted = await this.ltiPlatformRepository.delete(id)
    if (deleted.affected === 0) {
      this.logger.warn(`Platform with id ${id} not found for deletion`)
    }
  }

  //SECTION - Ephemeral datas

  getAccessToken(platformUrl: string, clientId: string, scopes: string): Promise<AccessTokenRecord | undefined> {
    return this.ephemeralStore.getAccessToken(platformUrl, clientId, scopes)
  }

  saveAccessToken(platformUrl: string, clientId: string, scopes: string, token: AccessTokenRecord) {
    return this.ephemeralStore.saveAccessToken(platformUrl, clientId, scopes, token)
  }

  getIdToken(id: string) {
    return this.ephemeralStore.getIdToken(id)
  }

  saveIdToken(token: IdTokenClaims) {
    return this.ephemeralStore.saveIdToken(token)
  }

  saveNonce(nonce: string) {
    return this.ephemeralStore.saveNonce(nonce)
  }

  consumeNonce(nonce: string) {
    return this.ephemeralStore.consumeNonce(nonce)
  }

  //SECTION - mapping

  private toRecord(row: LtiPlatformEntity): PlatformRecord {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      clientId: row.clientId,
      authenticationEndpoint: row.authenticationEndpoint,
      accessTokenEndpoint: row.accessTokenEndpoint,
      authorizationServer: row.authorizationServer ?? undefined,
      idTokenValidation: row.idTokenValidation as PlatformRecord['idTokenValidation'],
      active: row.active,
      keys: { public: row.publicKey, private: this.crypto.decrypt(row.privateKey) },
    }
  }
}

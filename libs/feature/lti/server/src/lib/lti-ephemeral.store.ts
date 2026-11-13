import { createHash, randomUUID } from 'node:crypto'
import type { AccessTokenRecord, IdTokenClaims, IdTokenRecord } from 'ltijs'
import { LtiCrypto } from './lti-crypto'
import { Redis } from 'ioredis'

/**
 * The 6 methods of the ltijs 7 `DatabaseManager` contract that deal with short-lived data.
 * Everything else (platforms + keys) stays in PostgreSQL.
 */
export interface LtiEphemeralStore {
  getAccessToken(platformUrl: string, clientId: string, scopes: string): Promise<AccessTokenRecord | undefined>
  saveAccessToken(platformUrl: string, clientId: string, scopes: string, token: AccessTokenRecord): Promise<string>
  getIdToken(id: string): Promise<IdTokenRecord | undefined>
  saveIdToken(token: IdTokenClaims): Promise<string>
  saveNonce(nonce: string): Promise<string>
  consumeNonce(nonce: string): Promise<boolean>
}

export interface RedisEphemeralStoreOptions {
  /** Prefix of every Redis key. Default: 'lti:' */
  prefix?: string
  /** id_token lifetime = max duration of a launch session that ltijs can resume. Default: 24 h */
  idTokenTtlSeconds?: number
  /** Max delay between issuing a nonce and consuming it. Default: 10 min */
  nonceTtlSeconds?: number
  /** Margin subtracted from an access token validity. Default: 30 s */
  accessTokenMarginSeconds?: number
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export class RedisLtiEphemeralStore implements LtiEphemeralStore {
  private readonly prefix: string
  private readonly idTokenTtlMs: number
  private readonly nonceTtlMs: number
  private readonly accessTokenMarginMs: number

  constructor(
    private readonly redis: Redis,
    private readonly crypto: LtiCrypto,
    options: RedisEphemeralStoreOptions = {}
  ) {
    this.prefix = options.prefix ?? 'lti:'
    this.idTokenTtlMs = (options.idTokenTtlSeconds ?? 24 * 3600) * 1000
    this.nonceTtlMs = (options.nonceTtlSeconds ?? 600) * 1000
    this.accessTokenMarginMs = (options.accessTokenMarginSeconds ?? 30) * 1000
  }

  /** Values coming from the network are hashed: no exotic characters or arbitrary-length keys in Redis. */
  private key(kind: 'at' | 'idt' | 'nonce', raw: string) {
    return `${this.prefix}${kind}:${sha256(raw)}`
  }

  // ------------------------------------------------------------ access tokens

  private accessTokenKey(platformUrl: string, clientId: string, scopes: string) {
    return this.key('at', JSON.stringify([platformUrl, clientId, scopes]))
  }

  async getAccessToken(platformUrl: string, clientId: string, scopes: string): Promise<AccessTokenRecord | undefined> {
    const raw = await this.redis.get(this.accessTokenKey(platformUrl, clientId, scopes))
    if (raw === null) return undefined
    try {
      return JSON.parse(this.crypto.decrypt(raw)) as AccessTokenRecord
    } catch {
      return undefined
    }
  }

  async saveAccessToken(platformUrl: string, clientId: string, scopes: string, token: AccessTokenRecord) {
    const key = this.accessTokenKey(platformUrl, clientId, scopes)
    const remainingMs = token.expires_in * 1000 - this.accessTokenMarginMs - (Date.now() - token.createdAt)
    if (Number.isFinite(remainingMs) && remainingMs >= 1) {
      // the token is a bearer secret: encrypted at rest, as ltijs-sequelize did
      await this.redis.set(key, this.crypto.encrypt(JSON.stringify(token)), 'PX', Math.floor(remainingMs))
    }
    return key
  }

  // ------------------------------------------------------------ id tokens

  async saveIdToken(token: IdTokenClaims) {
    const id = randomUUID()
    // contains personal data (name, email): encrypted at rest
    await this.redis.set(this.key('idt', id), this.crypto.encrypt(JSON.stringify(token)), 'PX', this.idTokenTtlMs)
    return id
  }

  async getIdToken(id: string) {
    const raw = await this.redis.get(this.key('idt', id))
    if (raw === null) return undefined
    try {
      return { ...JSON.parse(this.crypto.decrypt(raw)), id } as IdTokenRecord
    } catch {
      return undefined
    }
  }

  // ------------------------------------------------------------ nonces

  async saveNonce(nonce: string) {
    const key = this.key('nonce', nonce)
    await this.redis.set(key, '1', 'PX', this.nonceTtlMs)
    return key
  }

  /** DEL is atomic: if two requests consume the same nonce, only one gets `true`. */
  async consumeNonce(nonce: string) {
    return (await this.redis.del(this.key('nonce', nonce))) === 1
  }
}

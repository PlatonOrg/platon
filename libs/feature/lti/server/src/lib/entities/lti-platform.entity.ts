// TODO: similar to lms.entity.ts, keep only one of them.

import { BaseEntity } from '@platon/core/server'
import { Entity, Column, Index } from 'typeorm'

@Entity('LtiPlatforms')
@Index(['url', 'clientId'], { unique: true })
export class LtiPlatformEntity extends BaseEntity {
  @Column('text')
  name!: string

  @Column('text')
  url!: string

  @Column({ name: 'client_id', type: 'text' })
  clientId!: string

  @Column({ name: 'authentication_endpoint', type: 'text' })
  authenticationEndpoint!: string

  @Column({ name: 'access_token_endpoint', type: 'text' })
  accessTokenEndpoint!: string

  @Column({ name: 'authorization_server', type: 'text', nullable: true })
  authorizationServer?: string | null

  /**
   * How to verify the id_token sent by the LMS: { method: 'JWK_SET' | ..., key: '<LMS JWKS URL or key>' }
   * This is the LMS (public) key, not PLaTon's.
   */
  @Column({ name: 'id_token_validation', type: 'jsonb' })
  idTokenValidation!: { method: string; key: string }

  @Column({ type: 'boolean', default: false })
  active!: boolean

  /** PEM of PLaTon's public key for this platform (exposed on /lti/keys) */
  @Column({ name: 'public_key', type: 'text' })
  publicKey!: string

  /**
   * PEM of the private key, ENCRYPTED (AES-256-GCM, see LtiCrypto).
   * select: false => never loaded by default
   */
  @Column({ name: 'private_key', type: 'text', select: false })
  privateKey!: string
}

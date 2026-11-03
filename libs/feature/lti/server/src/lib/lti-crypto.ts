import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'

/**
 * Authenticated encryption (AES-256-GCM) for LTI secrets stored in the database.
 *
 * Stored format (a single text column):
 *   v1:<iv base64>:<authTag base64>:<ciphertext base64>
 *
 * - random 12-byte IV per value (never reused)
 * - authTag: any change to the ciphertext is detected on decryption
 * - version prefix: allows changing the algorithm / key later
 *
 * The key (32 bytes, base64) comes from an environment variable:
 *   openssl rand -base64 32
 */
export class LtiCrypto {
  private readonly key: Buffer

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key ?? '', 'base64')
    if (this.key.length !== 32) {
      throw new Error('LTI_ENCRYPTION_KEY must be a base64-encoded 32-byte key (openssl rand -base64 32)')
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [VERSION, iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':')
  }

  decrypt(payload: string): string {
    const [version, iv, tag, data] = payload.split(':')
    if (version !== VERSION || !iv || !tag || !data) {
      throw new Error('LTI_CIPHERTEXT_FORMAT_UNSUPPORTED')
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    const plain = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])
    return plain.toString('utf8')
  }
}

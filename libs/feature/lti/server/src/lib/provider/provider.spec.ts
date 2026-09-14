import { ConsumerError, ParameterError, SignatureError, StoreError } from './errors'
import { LTIProvider } from './provider'
import { HmacSha1 } from './signers/hmac-sha1'
import { NonceStore } from './stores/nonce-store'

describe('LTIProvider', () => {
  const consumerKey = 'consumer-key'
  const consumerSecret = 'consumer-secret'

  // Réplique les seules mutations que LTIProvider.parseRequest() applique in-place sur req.body
  // avant de calculer la signature (les flags is_admin/is_student/... sont ajoutés sur son body
  // interne, jamais réécrits sur req.body, donc ils ne font pas partie de la base signée).
  const withParsedFields = (body: Record<string, unknown>) => {
    const roles = Array.isArray(body['roles'])
      ? (body['roles'] as string[])
      : ((body['roles'] as string) || '').split(',').filter(Boolean)
    return {
      ...body,
      oauth_timestamp: Number.parseInt(body['oauth_timestamp'] as string, 10),
      roles,
    }
  }

  const buildSignedRequest = (bodyOverrides: Record<string, unknown> = {}) => {
    const rawBody: Record<string, unknown> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: 'nonce-' + Math.random(),
      oauth_timestamp: Math.round(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      oauth_signature_method: 'HMAC-SHA1',
      lti_message_type: 'basic-lti-launch-request',
      lti_version: 'LTI-1p0',
      resource_link_id: 'link-1',
      roles: 'Instructor',
      ...bodyOverrides,
    }

    const req = {
      body: rawBody,
      headers: { host: 'example.com' },
      protocol: 'https',
      originalUrl: '/lti/launch',
      method: 'POST',
      connection: {},
    }

    if (!('oauth_signature' in bodyOverrides)) {
      rawBody['oauth_signature'] = new HmacSha1().buildSignature(
        { ...req, body: withParsedFields(rawBody) },
        consumerSecret
      )
    }

    return req
  }

  describe('constructor', () => {
    it('devrait lever une ConsumerError si consumerKey est manquant', () => {
      expect(() => new LTIProvider('', consumerSecret)).toThrow(ConsumerError)
    })

    it('devrait lever une ConsumerError si consumerSecret est manquant', () => {
      expect(() => new LTIProvider(consumerKey, '')).toThrow(ConsumerError)
    })
  })

  describe('validate', () => {
    it('devrait valider une requête LTI correctement signée et retourner le payload enrichi', async () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest()

      const result = await provider.validate(req)

      expect(result.lti_message_type).toBe('basic-lti-launch-request')
      expect(result.is_instructor).toBe(true)
      expect(result.is_student).toBe(false)
      expect(result.roles).toEqual(['Instructor'])
    })

    it('devrait rejeter une signature invalide (payload altéré après signature)', async () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest()
      ;(req.body as Record<string, unknown>)['resource_link_id'] = 'tampered'

      await expect(provider.validate(req)).rejects.toBeInstanceOf(SignatureError)
    })

    it('devrait rejeter un lti_message_type incorrect avant même de vérifier la signature', async () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest({ lti_message_type: 'wrong-type' })

      await expect(provider.validate(req)).rejects.toBeInstanceOf(ParameterError)
    })

    it('devrait rejeter une version LTI non supportée', async () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest({ lti_version: 'LTI-2p0' })

      await expect(provider.validate(req)).rejects.toBeInstanceOf(ParameterError)
    })

    it('devrait rejeter une requête sans resource_link_id', () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest({ resource_link_id: undefined })

      return expect(provider.validate(req)).rejects.toBeInstanceOf(ParameterError)
    })

    it('devrait rejeter le rejeu du même nonce sur la même instance de provider', async () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest()

      await provider.validate(req)

      const replay = { ...req, body: { ...req.body } }
      await expect(provider.validate(replay)).rejects.toBeInstanceOf(StoreError)
    })

    it('devrait convertir une chaîne de rôles séparés par des virgules en tableau', async () => {
      const provider = new LTIProvider(consumerKey, consumerSecret)
      const req = buildSignedRequest({ roles: 'Instructor,urn:lti:sysrole:ims/lis/SysAdmin' })

      const result = await provider.validate(req)

      expect(result.roles).toEqual(['Instructor', 'urn:lti:sysrole:ims/lis/SysAdmin'])
      expect(result.is_admin).toBe(true)
      expect(result.is_instructor).toBe(true)
    })

    it('devrait utiliser le store de nonce personnalisé fourni via setNounceStore', async () => {
      const customStore: jest.Mocked<NonceStore> = { ensuresNotExpired: jest.fn() }
      const provider = new LTIProvider(consumerKey, consumerSecret).setNounceStore(customStore)
      const req = buildSignedRequest()

      await provider.validate(req)

      expect(customStore.ensuresNotExpired).toHaveBeenCalledWith(
        (req.body as Record<string, unknown>)['oauth_nonce'],
        expect.any(Number)
      )
    })

    it('devrait utiliser le signer personnalisé fourni via setSigner', async () => {
      const customSigner = {
        method: 'CUSTOM',
        buildSignature: jest.fn().mockReturnValue('expected-signature'),
        buildSignatureRaw: jest.fn(),
      }
      const provider = new LTIProvider(consumerKey, consumerSecret).setSigner(customSigner)
      const req = buildSignedRequest({ oauth_signature: 'expected-signature' })

      await expect(provider.validate(req)).resolves.toBeDefined()
      expect(customSigner.buildSignature).toHaveBeenCalledWith(req, consumerSecret)
    })
  })
})

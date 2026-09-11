import crypto from 'crypto'
import url from 'url'
import { HmacSha1 } from './hmac-sha1'

describe('HmacSha1', () => {
  let signer: HmacSha1

  beforeEach(() => {
    signer = new HmacSha1()
  })

  it("devrait exposer la méthode 'HMAC-SHA1'", () => {
    expect(signer.method).toBe('HMAC-SHA1')
  })

  describe('buildSignatureRaw', () => {
    it('devrait produire une signature HMAC-SHA1 déterministe et reproductible', () => {
      const reqUrl = 'https://example.com/lti/launch'
      const parsedUrl = url.parse(reqUrl, true)
      const params = { oauth_nonce: 'abc', a: '1', b: '2' }

      const signature = signer.buildSignatureRaw(reqUrl, parsedUrl, 'post', params, 'my-secret')

      const expectedBaseString = [
        'POST',
        encodeURIComponent(reqUrl),
        encodeURIComponent(['a=1', 'b=2', 'oauth_nonce=abc'].join('&')),
      ].join('&')
      const expected = crypto.createHmac('sha1', 'my-secret&').update(expectedBaseString).digest('base64')

      expect(signature).toBe(expected)
    })

    it('ne devrait pas inclure oauth_signature dans la base à signer', () => {
      const reqUrl = 'https://example.com/lti/launch'
      const parsedUrl = url.parse(reqUrl, true)

      const withoutSig = signer.buildSignatureRaw(reqUrl, parsedUrl, 'POST', { a: '1' }, 'secret')
      const withSig = signer.buildSignatureRaw(
        reqUrl,
        parsedUrl,
        'POST',
        { a: '1', oauth_signature: 'whatever' },
        'secret'
      )

      expect(withSig).toBe(withoutSig)
    })

    it('devrait ajouter le token OAuth à la clé de signature quand fourni', () => {
      const reqUrl = 'https://example.com/lti/launch'
      const parsedUrl = url.parse(reqUrl, true)

      const withoutToken = signer.buildSignatureRaw(reqUrl, parsedUrl, 'POST', { a: '1' }, 'secret')
      const withToken = signer.buildSignatureRaw(reqUrl, parsedUrl, 'POST', { a: '1' }, 'secret', 'token')

      expect(withToken).not.toBe(withoutToken)
    })

    it('devrait combiner les paramètres du corps et de la query string', () => {
      const reqUrl = 'https://example.com/lti/launch?q=1'
      const parsedUrl = url.parse(reqUrl, true)

      const combined = signer.buildSignatureRaw(reqUrl, parsedUrl, 'POST', { a: '1' }, 'secret')
      const bodyOnly = signer.buildSignatureRaw(
        reqUrl,
        url.parse(reqUrl.split('?')[0], true),
        'POST',
        { a: '1' },
        'secret'
      )

      expect(combined).not.toBe(bodyOnly)
    })
  })

  describe('buildSignature', () => {
    const secret = 'my-secret'

    const baseReq = (overrides: Record<string, unknown> = {}) => ({
      headers: { host: 'example.com' },
      protocol: 'https',
      originalUrl: '/lti/launch',
      method: 'POST',
      connection: {},
      body: { oauth_nonce: 'abc' },
      ...overrides,
    })

    it('devrait produire la même signature que buildSignatureRaw avec les paramètres équivalents', () => {
      const req = baseReq()
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'https://example.com/lti/launch'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', req.body, secret)

      expect(result).toBe(expected)
    })

    it('devrait utiliser req.url si originalUrl est absent', () => {
      const req = baseReq({ originalUrl: undefined, url: '/lti/other' })
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'https://example.com/lti/other'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', req.body, secret)

      expect(result).toBe(expected)
    })

    it("devrait préférer l'en-tête x-forwarded-proto au protocole de la requête", () => {
      const req = baseReq({ protocol: 'http', headers: { host: 'example.com', 'x-forwarded-proto': 'https' } })
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'https://example.com/lti/launch'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', req.body, secret)

      expect(result).toBe(expected)
    })

    it("devrait retomber sur connection.encrypted quand aucun protocole n'est fourni", () => {
      const req = baseReq({ protocol: undefined, connection: { encrypted: true } })
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'https://example.com/lti/launch'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', req.body, secret)

      expect(result).toBe(expected)
    })

    it('devrait retomber sur http quand aucun protocole ni connexion chiffrée', () => {
      const req = baseReq({ protocol: undefined, connection: { encrypted: false } })
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'http://example.com/lti/launch'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', req.body, secret)

      expect(result).toBe(expected)
    })

    it("devrait retirer la query string de l'URL pour les requêtes Canvas", () => {
      const req = baseReq({
        originalUrl: '/lti/launch?foo=bar',
        body: { oauth_nonce: 'abc', tool_consumer_info_product_family_code: 'canvas' },
      })
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'https://example.com/lti/launch'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', req.body, secret)

      expect(result).toBe(expected)
    })

    it('devrait déballer req.raw.req quand présent (compat Hapi)', () => {
      const inner = baseReq()
      const req = { raw: { req: inner }, body: inner.body }
      const result = signer.buildSignature(req, secret)

      const hitUrl = 'https://example.com/lti/launch'
      const expected = signer.buildSignatureRaw(hitUrl, url.parse(hitUrl, true), 'POST', inner.body, secret)

      expect(result).toBe(expected)
    })
  })
})

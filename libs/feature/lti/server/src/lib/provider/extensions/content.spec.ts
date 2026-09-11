import { ExtensionError } from '../errors'
import { LTIProvider } from '../provider'
import { ContentExtension } from './content'

describe('ContentExtension', () => {
  const buildRes = () => ({ redirect: jest.fn() })

  describe('constructor', () => {
    it("devrait parser les types de retour, l'URL de retour et les extensions de fichiers", () => {
      const ext = new ContentExtension({
        ext_content_return_types: 'file,url',
        ext_content_return_url: 'https://lms.example.com/return',
        ext_content_file_extensions: 'pdf,zip',
      })

      expect(ext.hasReturnType('file')).toBe(true)
      expect(ext.hasReturnType('url')).toBe(true)
      expect(ext.hasReturnType('iframe')).toBe(false)
      expect(ext.hasFileExtension('pdf')).toBe(true)
      expect(ext.hasFileExtension('exe')).toBe(false)
    })

    it('devrait retomber sur launch_presentation_return_url si ext_content_return_url est absent', () => {
      const ext = new ContentExtension({
        ext_content_return_types: 'url',
        launch_presentation_return_url: 'https://lms.example.com/launch-return',
      })

      const res = buildRes()
      ext.sendUrl(res as never, 'https://target.example.com', 'text', 'title', '_blank')

      expect(res.redirect).toHaveBeenCalledWith(303, expect.stringContaining('https://lms.example.com/launch-return'))
    })
  })

  describe('validation du type de retour', () => {
    it("devrait lever une ExtensionError si le type de retour demandé n'est pas supporté", () => {
      const ext = new ContentExtension({
        ext_content_return_types: 'iframe',
        ext_content_return_url: 'https://lms.example.com/return',
      })

      expect(() => ext.sendUrl(buildRes() as never, 'https://x.com', 't', 'ti', '_self')).toThrow(ExtensionError)
    })
  })

  describe('sendFile', () => {
    it("devrait rediriger vers l'URL de retour avec les paramètres file", () => {
      const ext = new ContentExtension({
        ext_content_return_types: 'file',
        ext_content_return_url: 'https://lms.example.com/return',
      })
      const res = buildRes()

      ext.sendFile(res, 'https://files.example.com/a.pdf', 'my file', 'application/pdf')

      const [status, url] = res.redirect.mock.calls[0]
      expect(status).toBe(303)
      expect(url).toContain('return_type=file')
      expect(url).toContain(encodeURIComponent('https://files.example.com/a.pdf'))
      expect(url).toContain('content_type=application%2Fpdf')
    })
  })

  describe('sendIframe', () => {
    it('devrait rediriger avec les paramètres iframe optionnels quand fournis', () => {
      const ext = new ContentExtension({
        ext_content_return_types: 'iframe',
        ext_content_return_url: 'https://lms.example.com/return',
      })
      const res = buildRes()

      ext.sendIframe(res, 'https://embed.example.com', 'My title', '800', '600')

      const url = res.redirect.mock.calls[0][1]
      expect(url).toContain('return_type=iframe')
      expect(url).toContain('title=My')
      expect(url).toContain('width=800')
      expect(url).toContain('height=600')
    })

    it('ne devrait pas inclure les paramètres optionnels absents', () => {
      const ext = new ContentExtension({
        ext_content_return_types: 'iframe',
        ext_content_return_url: 'https://lms.example.com/return',
      })
      const res = buildRes()

      ext.sendIframe(
        res,
        'https://embed.example.com',
        undefined as unknown as string,
        undefined as unknown as string,
        undefined as unknown as string
      )

      const url = res.redirect.mock.calls[0][1]
      expect(url).not.toContain('title=')
      expect(url).not.toContain('width=')
      expect(url).not.toContain('height=')
    })
  })

  describe('fromProvider', () => {
    it('devrait construire une ContentExtension quand ext_content_return_types est présent dans le payload', () => {
      const provider = new LTIProvider('key', 'secret')
      Object.assign(provider.body, { ext_content_return_types: 'url', ext_content_return_url: 'https://x.com' })

      const ext = ContentExtension.fromProvider(provider)

      expect(ext).toBeInstanceOf(ContentExtension)
      expect(ext?.hasReturnType('url')).toBe(true)
    })

    it('devrait retourner undefined si ext_content_return_types est absent', () => {
      const provider = new LTIProvider('key', 'secret')

      expect(ContentExtension.fromProvider(provider)).toBeUndefined()
    })
  })
})

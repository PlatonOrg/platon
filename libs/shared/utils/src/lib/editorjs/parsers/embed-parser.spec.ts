import { EmbedParser } from './embed-parser'

describe('EmbedParser', () => {
  it('rend un iframe pointant vers l’URL embed', () => {
    const html = EmbedParser({ embed: 'https://www.youtube.com/embed/xyz' })
    expect(html).toContain('<div class="embed">')
    expect(html).toContain('<iframe src="https://www.youtube.com/embed/xyz"')
  })

  it('inclut la largeur et la hauteur quand elles sont fournies', () => {
    const html = EmbedParser({ embed: 'https://www.youtube.com/embed/xyz', width: 560, height: 315 })
    expect(html).toContain('width="560"')
    expect(html).toContain('height="315"')
  })

  it('affiche la légende quand elle est fournie', () => {
    const html = EmbedParser({ embed: 'https://www.youtube.com/embed/xyz', caption: 'Ma vidéo' })
    expect(html).toContain('<div class="embed-caption">Ma vidéo</div>')
  })

  it('ne rend rien pour une URL non https (ex: javascript:)', () => {
    expect(EmbedParser({ embed: 'javascript:alert(1)' })).toBe('')
    expect(EmbedParser({ embed: 'http://example.com/embed' })).toBe('')
  })

  it('ne rend rien sans embed', () => {
    expect(EmbedParser({} as any)).toBe('')
  })

  it('échappe les caractères dangereux pour éviter une injection dans les attributs HTML', () => {
    const html = EmbedParser({ embed: 'https://example.com/"><script>alert(1)</script>' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('échappe la légende', () => {
    const html = EmbedParser({ embed: 'https://www.youtube.com/embed/xyz', caption: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img')
  })
})

import { CalloutParser } from './callout-parser'

describe('CalloutParser', () => {
  it('rend le texte et une icône SVG dans un div avec la classe de variante correspondante', () => {
    const html = CalloutParser({ variant: 'important', text: 'Attention à ceci' })
    expect(html).toContain('class="ce-callout ce-callout--important"')
    expect(html).toContain('<span class="ce-callout__icon"><svg')
    expect(html).toContain('<p>Attention à ceci</p>')
  })

  it.each([['info'], ['important'], ['dialogue']] as const)(
    'gère la variante %s avec une icône distincte',
    (variant) => {
      const html = CalloutParser({ variant, text: 'x' })
      expect(html).toContain(`ce-callout--${variant}`)
      expect(html).toContain('<svg')
    }
  )

  it('affiche une icône différente selon la variante', () => {
    const info = CalloutParser({ variant: 'info', text: 'x' })
    const important = CalloutParser({ variant: 'important', text: 'x' })
    const dialogue = CalloutParser({ variant: 'dialogue', text: 'x' })

    const icons = new Set([info, important, dialogue].map((html) => html.match(/<svg.*?<\/svg>/)?.[0]))
    expect(icons.size).toBe(3)
  })
})

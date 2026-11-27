import { TestBed } from '@angular/core/testing'
import { NgeMonacoLoaderService, NgeMonacoThemeService } from '@cisstech/nge/monaco'
import { ThomasColorizerService } from './thomas-colorizer.service'

/** Colore comme Monaco : une balise <span> par ligne, séparées par des <br>. */
const colorizeElement = jest.fn(async (element: HTMLElement) => {
  const lines = (element.textContent ?? '').split('\n')
  element.replaceChildren(
    ...lines.flatMap((line, index) => {
      const span = document.createElement('span')
      span.textContent = line
      return index ? [document.createElement('br'), span] : [span]
    })
  )
})

describe('ThomasColorizerService', () => {
  let service: ThomasColorizerService

  beforeEach(() => {
    Object.assign(globalThis, {
      monaco: { languages: { getLanguages: () => [{ id: 'python' }] }, editor: { colorizeElement } },
    })
    TestBed.configureTestingModule({
      providers: [
        { provide: NgeMonacoLoaderService, useValue: { loadAsync: async () => undefined } },
        { provide: NgeMonacoThemeService, useValue: { theme: undefined } },
      ],
    })
    service = TestBed.inject(ThomasColorizerService)
  })

  async function colorize(code: string, options: { lines?: string; highlights?: string } = {}) {
    const pre = document.createElement('pre')
    const element = document.createElement('code')
    pre.appendChild(element)
    await service.colorizeElement({ element, code, language: 'python', ...options })
    const numbers = Array.from(element.querySelectorAll('.line-numbers'), (n) => n.textContent)
    const rows = Array.from(element.querySelectorAll('div[style*="flex: 1"] > div, :scope > div:not([style])'))
    return { element, numbers, rows: rows.length ? rows : Array.from(element.children) }
  }

  it('écrit un numéro en face de chaque ligne, lignes vides comprises', async () => {
    const { numbers, rows } = await colorize('a = 1\n\nb = 2\n\nprint(a + b)', { lines: '1' })

    expect(numbers).toEqual(['1', '2', '3', '4', '5'])
    expect(rows.map((row) => row.textContent)).toEqual(['a = 1', '', 'b = 2', '', 'print(a + b)'])
  })

  it('donne la même hauteur aux lignes et à leurs numéros, même sans surlignage', async () => {
    const { element } = await colorize('a = 1\nb = 2', { lines: '1' })
    const heights = Array.from(element.querySelectorAll<HTMLElement>('div'), (div) => div.style.height).filter(Boolean)

    expect(heights).toHaveLength(4) // 2 numéros et 2 lignes
    expect(new Set(heights)).toEqual(new Set(['18px']))
  })

  it('surligne les bonnes lignes après une ligne vide', async () => {
    const { element } = await colorize('a = 1\n\nb = 2\nc = 3', { highlights: '3-4' })
    const highlighted = Array.from(element.querySelectorAll('.rangeHighlight'), (row) => row.textContent)

    expect(highlighted).toEqual(['b = 2', 'c = 3'])
  })

  it('ne numérote que les lignes demandées', async () => {
    const { numbers } = await colorize('a\nb\nc\nd\ne', { lines: '2 4' })
    expect(numbers).toEqual(['', '2', '', '4', ''])
  })

  it("n'écrit que le résultat du dernier appel quand deux colorations du même élément se chevauchent", async () => {
    const pre = document.createElement('pre')
    const element = document.createElement('code')
    pre.appendChild(element)
    await Promise.all([
      service.colorizeElement({ element, code: 'ancien', language: 'python', lines: '1' }),
      service.colorizeElement({ element, code: 'a = 1\nb = 2', language: 'python', lines: '1' }),
    ])

    expect(Array.from(element.querySelectorAll('.line-numbers'), (n) => n.textContent)).toEqual(['1', '2'])
    expect(element.textContent).not.toContain('ancien')
    expect(element.querySelectorAll('.line-numbers').length).toBe(2) // pas de structure imbriquée
  })

  it('laisse le code tel quel sans numéros ni surlignage', async () => {
    const { element } = await colorize('a = 1\nb = 2')
    expect(element.innerHTML).toBe('<span>a = 1</span><br><span>b = 2</span>')
  })
})

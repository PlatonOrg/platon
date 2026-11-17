import {
  CodeViewerState,
  codeViewerLanguageSupported,
  codeViewerLines,
  codeViewerMarkdown,
  codeViewerWarnings,
} from './code-viewer'

const markdown = (state: Partial<CodeViewerState>) =>
  codeViewerMarkdown({
    language: 'python',
    code: 'a = 1\nb = 2',
    lines: '',
    highlights: '',
    ...state,
  } as CodeViewerState)

describe('codeViewerLines', () => {
  it('numérote chaque ligne avec un pas de 1', () => {
    expect(codeViewerLines('1', 10)).toBe('1')
  })

  it('numérote une ligne sur n', () => {
    expect(codeViewerLines('5', 12)).toBe('5 10')
    expect(codeViewerLines('2', 7)).toBe('2 4 6')
  })

  it('répète un numéro unique, que le colorateur lirait comme « cette ligne et les suivantes »', () => {
    expect(codeViewerLines('5', 7)).toBe('5 5')
  })

  it.each(['', '  ', '0', '-2', '1.5', 'abc'])('ne numérote rien pour « %s »', (lines) => {
    expect(codeViewerLines(lines, 10)).toBe('')
  })

  it('ne numérote rien quand le code est plus court que le pas', () => {
    expect(codeViewerLines('5', 3)).toBe('')
  })
})

describe('codeViewerMarkdown', () => {
  it('écrit le code dans un bloc avec les numéros et les lignes surlignées', () => {
    expect(markdown({ lines: '1', highlights: '2' })).toBe('```python lines="1" highlights="2"\na = 1\nb = 2\n```\n')
  })

  it("n'ajoute pas d'attribut vide", () => {
    expect(markdown({})).toBe('```python\na = 1\nb = 2\n```\n')
  })

  it("n'écrit pas une valeur de highlights invalide, qui pourrait casser l'attribut", () => {
    expect(markdown({ highlights: '2" onclick="x' })).toBe('```python\na = 1\nb = 2\n```\n')
  })

  it('allonge la clôture quand le code contient des accents graves', () => {
    expect(markdown({ language: 'markdown', code: '```js\nx\n```' })).toBe('````markdown\n```js\nx\n```\n````\n')
  })
})

describe('codeViewerWarnings', () => {
  const warnings = (state: Partial<CodeViewerState>) =>
    codeViewerWarnings({ language: 'python', code: '', lines: '', highlights: '', ...state } as CodeViewerState)

  it("n'avertit pas pour des valeurs valides ou vides", () => {
    expect(warnings({})).toEqual([])
    expect(warnings({ lines: ' 5 ', highlights: '1 3-4  8' })).toEqual([])
  })

  it('signale une valeur de lines invalide', () => {
    expect(warnings({ lines: 'oui' })).toEqual([
      'Valeur de lines invalide : « oui ». Attendu : un entier positif, par exemple « 1 » ou « 5 ».',
    ])
  })

  it.each(['1,3', '2-', 'a-b', '1 - 3'])('signale la valeur de highlights invalide « %s »', (highlights) => {
    expect(warnings({ highlights })).toEqual([
      `Valeur de highlights invalide : « ${highlights} ». Attendu : des numéros ou des plages de lignes, par exemple « 2 4-5 ».`,
    ])
  })
})

describe('codeViewerLanguageSupported', () => {
  const languages = [{ id: 'plaintext' }, { id: 'python', aliases: ['Python', 'py'] }]

  it('reconnaît un langage par son identifiant ou un alias', () => {
    expect(codeViewerLanguageSupported('python', languages)).toBe(true)
    expect(codeViewerLanguageSupported('py', languages)).toBe(true)
  })

  it('accepte un langage vide, affiché en texte brut', () => {
    expect(codeViewerLanguageSupported('', languages)).toBe(true)
  })

  it('refuse un langage inconnu', () => {
    expect(codeViewerLanguageSupported('brainfuck', languages)).toBe(false)
  })
})

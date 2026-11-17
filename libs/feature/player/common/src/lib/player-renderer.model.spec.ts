import { ExerciseVariables } from '@platon/feature/compiler'
import { withRenderedTemplates } from './player-renderer.model'

const picker = { cid: 'picker-cid', selector: 'wc-picker', items: ['cm', 'km'] }
const input = { cid: 'input-cid', selector: 'wc-input-box' }

const render = (variables: Record<string, unknown>) =>
  withRenderedTemplates({ ...variables } as unknown as ExerciseVariables)

const scriptIdOf = (html: string, selector: string) =>
  (html.match(new RegExp(`<${selector} data-script-id='([^']+)'`)) as RegExpMatchArray)[1]

describe('withRenderedTemplates', () => {
  it('laisse un composant dans la phrase qui le contient', () => {
    const { form } = render({ picker, form: 'La distance se mesure en {{ picker }} et c’est tout.' })
    const id = scriptIdOf(form as string, 'wc-picker')

    const [sentence, scripts] = (form as string).split('\n\n')
    expect(sentence).toBe(
      `La distance se mesure en <wc-picker data-script-id='${id}' cid='picker-cid'></wc-picker> et c’est tout.`
    )
    expect(scripts).toBe(`<script type='application/json' id='${id}'>${JSON.stringify(picker)}</script>`)
  })

  it('ajoute à la fin le script de chaque composant utilisé, une seule fois', () => {
    const { form } = render({ picker, input, form: '{{ picker }} {{ input }} {{ picker }}' })
    const scripts = (form as string).split('\n\n')[1].split('\n')

    expect(scripts).toHaveLength(2)
    expect(scripts[0]).toContain(`id='${scriptIdOf(form as string, 'wc-picker')}'`)
    expect(scripts[1]).toContain(`id='${scriptIdOf(form as string, 'wc-input-box')}'`)
  })

  it('ajoute à chaque template les scripts de ses propres composants', () => {
    const { statement, form } = render({ picker, input, statement: 'Énoncé {{ picker }}', form: '{{ input }}' })

    expect(statement).toContain('wc-picker')
    expect(statement).not.toContain('wc-input-box')
    expect(form).toContain('wc-input-box')
    expect(form).not.toContain('wc-picker')
  })

  it('protège le JSON des scripts de la syntaxe réécrite par le markdown', () => {
    const slides = {
      cid: 'slides-cid',
      selector: 'wc-presenter',
      contents: 'Formules $a^2 + b^2$, \\(x\\), $$y$$ et \\[z\\], icône @fa star@, `code`, fin </script> \\\\ \\n',
    }
    const { statement } = render({ slides, statement: 'Diaporama : {{ slides }}' })
    const script = (statement as string).split('\n\n')[1]
    const json = (script.match(/^<script type='application\/json' id='[^']+'>(.*)<\/script>$/) as RegExpMatchArray)[1]

    expect(json).not.toMatch(/[$@`<]|\\\(|\\\[/)
    expect(JSON.parse(json)).toEqual(slides)
  })

  it('ne modifie pas un template sans composant', () => {
    const { form } = render({ picker, form: 'Texte sans composant' })
    expect(form).toBe('Texte sans composant')
  })
})

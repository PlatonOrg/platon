import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MatButtonModule } from '@angular/material/button'
import { WebComponentService } from '../../web-component.service'
import { BindedBubblesState } from './binded-bubbles'
import { BindedBubblesComponent } from './binded-bubbles.component'

/** `wc-base` (éditeur de l'état en mode debug) n'est pas utile ici et dépend de Monaco. */
@Component({ selector: 'wc-base', template: '' })
class BaseStubComponent {
  @Input() state: unknown
  @Output() stateChange = new EventEmitter<unknown>()
}

/** Affiche le contenu brut à la place du rendu markdown. */
// eslint-disable-next-line @angular-eslint/component-selector -- remplace le composant externe nge-markdown
@Component({ selector: 'nge-markdown', template: '{{ data }}' })
class MarkdownStubComponent {
  @Input() data?: string
}

const PAIRS: [string, string][] = [
  ['chat', 'cat'],
  ['chien', 'dog'],
  ['oiseau', 'bird'],
  ['cheval', 'horse'],
  ['poisson', 'fish'],
  ['lapin', 'rabbit'],
]

const TIMEOUT = 10

describe('BindedBubblesComponent', () => {
  let fixture: ComponentFixture<BindedBubblesComponent>
  let submit: jest.SpyInstance

  async function setup(state: Partial<BindedBubblesState> = {}) {
    await TestBed.configureTestingModule({ imports: [BindedBubblesComponent] })
      .overrideComponent(BindedBubblesComponent, {
        set: { imports: [CommonModule, MatButtonModule, BaseStubComponent, MarkdownStubComponent] },
      })
      .compileComponents()
    submit = jest.spyOn(TestBed.inject(WebComponentService), 'submit').mockImplementation(() => undefined)
    fixture = TestBed.createComponent(BindedBubblesComponent)
    fixture.componentInstance.state = {
      items: PAIRS.map(([a, b]) => ({ item1: { content: a }, item2: { content: b } })),
      numberPairToShow: 2,
      nbError: 0,
      errors: [],
      mode: 'shuffle',
      timeout: TIMEOUT,
      ...state,
    } as BindedBubblesState
    await render()
  }

  async function render() {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  afterEach(() => jest.restoreAllMocks())

  const state = () => fixture.componentInstance.state
  const columns = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.column'))
  /** Bulles encore jouables d'une colonne (les bulles trouvées sont masquées). */
  const column = (index: 0 | 1) =>
    Array.from(columns()[index].querySelectorAll('button'))
      .filter((button) => !button.classList.contains('achieved') && !button.classList.contains('disabled'))
      .map((button) => button.textContent?.trim() as string)
  /** Bulles grisées (paires trouvées qui ne seront plus remplacées). */
  const greyed = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button.disabled') as NodeListOf<HTMLButtonElement>)
  const button = (label: string) =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (b) => b.textContent?.trim() === label
    ) as HTMLButtonElement
  const translation = (word: string) => (PAIRS.find(([french]) => french === word) as [string, string])[1]
  /** Une paire affichée que l'apprenant peut former. */
  const displayedPair = () => {
    const french = column(0).find((word) => column(1).includes(translation(word))) as string
    return [french, translation(french)]
  }
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  async function click(label: string) {
    button(label).click()
    await render()
  }

  async function findPair(french: string, english: string) {
    await click(french)
    await click(english)
    await wait(TIMEOUT * 3)
    await render()
  }

  it('affiche des paires complètes en deux colonnes au départ', async () => {
    await setup()
    expect(columns()).toHaveLength(2)
    expect(column(0)).toHaveLength(2)
    expect(column(1).sort()).toEqual(column(0).map(translation).sort())
  })

  it('compte une erreur lorsque deux bulles ne forment pas une paire', async () => {
    await setup()
    const [french, other] = column(0)

    await click(french)
    await click(translation(other))

    expect(state().nbError).toBe(1)
    expect(state().errors.map((pair) => [pair.item1.content, pair.item2.content])).toEqual([
      [french, translation(other)],
    ])
    expect(button(french).classList).toContain('error')
  })

  it('remplace une paire trouvée par un mot et une traduction tirés indépendamment', async () => {
    await setup()
    const [french, english] = displayedPair()
    // 1er tirage : 1re bulle cachée de gauche (oiseau) ; 2e tirage : 2e bulle cachée de droite (horse)
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.3)

    await findPair(french, english)

    expect(column(0)).toContain('oiseau')
    expect(column(1)).toContain('horse')
    expect(column(0)).not.toContain(french)
    expect(column(1)).not.toContain(english)
  })

  it('garde toujours au moins une paire à former', async () => {
    await setup()
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.3)
    await findPair('chat', 'cat') // affiche oiseau à gauche et horse à droite
    expect(column(0).sort()).toEqual(['chien', 'oiseau'])
    expect(column(1).sort()).toEqual(['dog', 'horse'])

    // poisson et rabbit ne laisseraient aucune paire (oiseau/horse, poisson/rabbit) : la traduction
    // tirée est remplacée par celle d'un mot affiché
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.9)
    await findPair('chien', 'dog')

    expect(column(0).sort()).toEqual(['oiseau', 'poisson'])
    expect(column(1)).not.toContain('rabbit')
    expect(displayedPair()[0]).toBeDefined()
  })

  it('soumet automatiquement lorsque toutes les paires sont trouvées', async () => {
    await setup()
    for (let round = 0; round < PAIRS.length; round++) {
      const [french, english] = displayedPair()
      await findPair(french, english)
    }

    expect(state().items.every((pair) => pair.item1.state === 'achieved' && pair.item2.state === 'achieved')).toBe(true)
    expect(state().nbError).toBe(0)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('grise les paires trouvées quand il ne reste plus de bulles à afficher', async () => {
    await setup()
    // 6 paires dont 2 affichées : les 4 premières paires trouvées sont remplacées
    for (let round = 0; round < PAIRS.length - 2; round++) {
      const [french, english] = displayedPair()
      await findPair(french, english)
      expect(greyed()).toHaveLength(0)
    }

    const [french, english] = displayedPair()
    await click(french)
    await click(english)
    // grisées tout de suite, sans attendre le délai ni disparaître
    expect(greyed().map((b) => b.textContent?.trim())).toEqual(expect.arrayContaining([french, english]))
    expect(greyed()).toHaveLength(2)
    expect(greyed().every((b) => b.disabled)).toBe(true)

    const [lastFrench, lastEnglish] = displayedPair()
    await findPair(lastFrench, lastEnglish)
    expect(greyed()).toHaveLength(4)
    expect(fixture.nativeElement.querySelectorAll('button.achieved')).toHaveLength(0)
    // l'état garde les paires « achieved » pour le grader
    expect(state().items.every((pair) => pair.item1.state === 'achieved')).toBe(true)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  describe('après une validation (état restauré)', () => {
    /** État renvoyé après une validation : les `found` premières paires sont trouvées. */
    const submitted = (found: number, mode: BindedBubblesState['mode'] = 'shuffle') => ({
      mode,
      nbError: 1,
      errors: [
        { item1: { id: '0', content: 'chat', state: 'error' }, item2: { id: '3', content: 'dog', state: 'error' } },
      ],
      items: PAIRS.map(([a, b], index) => ({
        item1: {
          id: `${2 * index}`,
          content: a,
          state: index < found ? 'achieved' : index === found ? 'error' : 'unchecked',
        },
        item2: { id: `${2 * index + 1}`, content: b, state: index < found ? 'achieved' : 'checked' },
      })),
    })

    it.each(['shuffle', 'ordered'] as const)('garde les paires trouvées en mode %s', async (mode) => {
      await setup(submitted(2, mode) as Partial<BindedBubblesState>)

      expect(column(0).sort()).toEqual(['cheval', 'oiseau'])
      expect(column(1).sort()).toEqual(['bird', 'horse'])
      expect(state().items.map((pair) => pair.item1.state)).toEqual([
        'achieved',
        'achieved',
        'unchecked',
        'unchecked',
        'unchecked',
        'unchecked',
      ])
      expect(state().items.every((pair) => pair.item2.state === pair.item1.state)).toBe(true)
      expect(state().nbError).toBe(1)
    })

    it('soumet une seule fois quand les paires restantes sont trouvées', async () => {
      await setup(submitted(2) as Partial<BindedBubblesState>)
      for (let round = 0; round < PAIRS.length - 2; round++) {
        const [french, english] = displayedPair()
        await findPair(french, english)
      }

      expect(submit).toHaveBeenCalledTimes(1)
      expect(state().items.every((pair) => pair.item1.state === 'achieved')).toBe(true)
    })

    it('affiche les dernières paires grisées quand tout est trouvé', async () => {
      await setup(submitted(PAIRS.length) as Partial<BindedBubblesState>)

      const disabled = greyed()
      expect(disabled.map((b) => b.textContent?.trim()).sort()).toEqual(['fish', 'lapin', 'poisson', 'rabbit'])
      expect(disabled.every((b) => b.disabled)).toBe(true)
      expect(state().items.every((pair) => pair.item1.state === 'achieved')).toBe(true)
      expect(submit).not.toHaveBeenCalled()
    })
  })

  it('remplace une paire trouvée par une paire complète en mode ordered', async () => {
    await setup({ mode: 'ordered' })
    for (let round = 0; round < 3; round++) {
      const [french, english] = displayedPair()
      await findPair(french, english)
      expect(column(1).sort()).toEqual(column(0).map(translation).sort())
    }
  })
})

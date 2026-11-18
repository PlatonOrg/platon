import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CircuitState } from './circuit'
import { CircuitComponent } from './circuit.component'
import { CircuitSchema } from './render'

/** `wc-base` (éditeur de l'état en mode debug) n'est pas utile ici et dépend de Monaco. */
@Component({ selector: 'wc-base', template: '' })
class BaseStubComponent {
  @Input() state: unknown
  @Output() stateChange = new EventEmitter<unknown>()
}

const SCHEMA: CircuitSchema = {
  unit: 40,
  elements: [
    { type: 'V', id: 'E', from: [0, 4], to: [0, 0], value: 12 },
    { type: 'switch', id: 'K1', from: [0, 0], to: [3, 0] },
    { type: 'selector', id: 'K2', at: [3, 0], throws: 3 },
    { type: 'switch', id: 'KF', from: [0, 4], to: [3, 4], state: 1, fixed: true },
    {
      type: 'wire',
      points: [
        [5, -2],
        [6, -2],
        [6, 4],
        [3, 4],
      ],
    },
  ],
}

describe('CircuitComponent', () => {
  let fixture: ComponentFixture<CircuitComponent>
  let emitted: number

  async function setup(state: Partial<CircuitState> = {}) {
    await TestBed.configureTestingModule({ imports: [CircuitComponent] })
      .overrideComponent(CircuitComponent, { set: { imports: [CommonModule, BaseStubComponent] } })
      .compileComponents()
    fixture = TestBed.createComponent(CircuitComponent)
    fixture.componentInstance.state = { schema: SCHEMA, value: {}, ...state } as CircuitState
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    emitted = 0
    fixture.componentInstance.stateChange.subscribe(() => emitted++)
  }

  const state = () => fixture.componentInstance.state
  const root = (): HTMLElement => fixture.nativeElement
  const group = (id: string) => root().querySelector(`svg g[data-id="${id}"]`) as SVGGElement

  async function press(id: string, event: Event) {
    group(id).dispatchEvent(event)
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const click = (id: string) => press(id, new MouseEvent('click', { bubbles: true }))
  const key = (id: string, k: string) => press(id, new KeyboardEvent('keydown', { key: k, bubbles: true }))

  it('complète la valeur avec la position de tous les interrupteurs sans marquer la réponse comme remplie', async () => {
    await setup({ value: { K2: 2, X: 1 } })
    expect(state().value).toEqual({ K1: 0, K2: 2, KF: 1 })
    expect(state().isFilled).toBe(false)
  })

  it('fait passer un interrupteur à la position suivante au clic et marque la réponse comme remplie', async () => {
    await setup()
    expect(group('K1').getAttribute('aria-label')).toBe('Interrupteur K1 : ouvert')

    await click('K1')
    expect(state().value).toEqual({ K1: 1, K2: 0, KF: 1 })
    expect(state().isFilled).toBe(true)
    expect(group('K1').getAttribute('aria-label')).toBe('Interrupteur K1 : fermé')
    expect(group('K1').getAttribute('data-state')).toBe('1')

    // un commutateur à trois positions fait le tour de ses bornes
    await click('K2')
    await click('K2')
    await click('K2')
    expect(state().value['K2']).toBe(0)
  })

  it("n'émet qu'un changement d'état par clic une fois la réponse remplie", async () => {
    await setup()
    await click('K1')
    emitted = 0
    await click('K1')
    expect(emitted).toBe(1)
  })

  it('manœuvre un interrupteur au clavier avec Entrée ou Espace seulement', async () => {
    await setup()
    expect(group('K1').getAttribute('role')).toBe('button')
    expect(group('K1').getAttribute('tabindex')).toBe('0')

    await key('K1', 'Enter')
    expect(state().value['K1']).toBe(1)
    await key('K1', ' ')
    expect(state().value['K1']).toBe(0)
    await key('K1', 'a')
    expect(state().value['K1']).toBe(0)
  })

  it('ne manœuvre pas un interrupteur fixe', async () => {
    await setup()
    expect(group('KF').getAttribute('role')).toBe('img')
    expect(group('KF').hasAttribute('tabindex')).toBe(false)
    expect(group('KF').getAttribute('aria-label')).toBe('Interrupteur fixe KF : fermé')

    await click('KF')
    expect(state().value['KF']).toBe(1)
    expect(state().isFilled).toBe(false)
  })

  it('désactivé, sert de figure : aucun bouton, aucun changement, pas de ligne d’aide', async () => {
    await setup({ disabled: true, value: { K1: 1 } })
    expect(root().querySelector('svg')?.getAttribute('role')).toBe('img')
    expect(root().querySelector('[role="button"]')).toBeNull()
    expect(group('K1').getAttribute('aria-label')).toBe('Interrupteur K1 : fermé')
    expect(root().querySelector('.help')).toBeNull()

    await click('K1')
    expect(state().value['K1']).toBe(1)
    expect(state().isFilled).toBe(false)
  })

  it("affiche la légende et masque la ligne d'aide sur demande", async () => {
    await setup({ caption: 'Figure 1', hideHelp: true })
    expect(root().querySelector('figcaption')?.textContent?.trim()).toBe('Figure 1')
    expect(root().querySelector('.help')).toBeNull()
  })

  it('affiche la ligne d’aide pour un schéma interactif', async () => {
    await setup()
    expect(root().querySelector('.help')).not.toBeNull()
  })

  it('affiche les erreurs de description au-dessus du schéma', async () => {
    await setup({ schema: { elements: [{ type: 'foo' }, { type: 'switch', from: [0, 0], to: [2, 0] }] } })
    const errors = root().querySelectorAll('.errors li')
    expect(errors.length).toBe(2)
    expect(root().querySelector('.errors')?.getAttribute('role')).toBe('alert')
  })
})

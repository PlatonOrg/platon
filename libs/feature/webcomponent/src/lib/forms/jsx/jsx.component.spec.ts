/// <reference types="jsxgraph" />
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { dirname, join } from 'path'
import { of } from 'rxjs'
import { JsxState } from './jsx'
import { JsxComponent } from './jsx.component'

// API du navigateur utilisées par JSXGraph et absentes de jsdom.
Object.assign(globalThis, {
  CSS: { escape: (value: string) => value, supports: () => false },
  IntersectionObserver: class {
    observe = () => undefined
    unobserve = () => undefined
    disconnect = () => undefined
  },
})
window.matchMedia = () =>
  ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined } as never)

// Le composant charge JSXGraph par une balise <script> : on fournit directement la bibliothèque
// (le fichier copié dans les assets de l'application, que l'export du paquet ne donne pas).
const jsxgraphCore = join(dirname(require.resolve('jsxgraph')), '..', 'distrib', 'jsxgraphcore.js')
;(globalThis as Record<string, unknown>)['JXG'] = require(jsxgraphCore)

/** `wc-base` (éditeur de l'état en mode debug) n'est pas utile ici et dépend de Monaco. */
@Component({ selector: 'wc-base', template: '' })
class BaseStubComponent {
  @Input() state: unknown
  @Output() stateChange = new EventEmitter<unknown>()
}

const SCRIPT = `
const A = board.create('point', [2, 3], { name: 'A', fixed: true });
const B = board.create('point', [-1, 1], { name: 'B', fixed: true });
board.create('segment', [A, B]);
board.create('point', [0, 0], { name: 'M' });
board.create('midpoint', [A, B], { name: 'I' });
`

describe('JsxComponent', () => {
  let fixture: ComponentFixture<JsxComponent>

  /** Crée le composant comme le player : l'état est donné avant l'initialisation. */
  async function setup(state: Partial<JsxState> = {}) {
    await TestBed.configureTestingModule({
      imports: [JsxComponent],
      providers: [{ provide: ResourceLoaderService, useValue: { loadAllSync: () => of(undefined) } }],
    })
      .overrideComponent(JsxComponent, { set: { imports: [BaseStubComponent] } })
      .compileComponents()
    fixture = TestBed.createComponent(JsxComponent)
    document.body.appendChild(fixture.nativeElement)
    fixture.componentInstance.state = { script: SCRIPT, ...state } as JsxState
    fixture.detectChanges()
    await fixture.whenStable()
  }

  afterEach(() => {
    fixture?.destroy()
    fixture?.nativeElement.remove()
  })

  const state = () => fixture.componentInstance.state
  const board = () => Object.values(JXG.boards as Record<string, JXG.Board>).at(-1) as JXG.Board
  const point = (name: string) => board().objectsList.find((o) => JXG.isPoint(o) && o.name === name) as JXG.Point
  const position = (name: string) => [point(name).X(), point(name).Y()]

  it('lit les positions initiales des points du script', async () => {
    await setup()
    expect(state().points).toEqual({
      A: { x: 2, y: 3 },
      B: { x: -1, y: 1 },
      M: { x: 0, y: 0 },
      I: { x: 0.5, y: 2 },
    })
    expect(state().isFilled).toBe(false)
  })

  it('remet les points déplacés par l’apprenant après une validation', async () => {
    await setup({ points: { M: { x: 1, y: -1 } } })

    expect(position('M')).toEqual([1, -1])
    expect(state().points['M']).toEqual({ x: 1, y: -1 })
    expect(state().isFilled).toBe(false)
  })

  it('ne déplace ni les points fixes ni les points construits', async () => {
    await setup({ points: { A: { x: 5, y: 5 }, I: { x: 4, y: 4 }, M: { x: 1, y: -1 } } })

    expect(position('A')).toEqual([2, 3])
    expect(position('I')).toEqual([0.5, 2])
    expect(state().points['A']).toEqual({ x: 2, y: 3 })
  })

  it('place les points aux positions du nouveau script quand le script change', async () => {
    await setup({ points: { M: { x: 1, y: -1 } } })
    fixture.componentInstance.state = { script: SCRIPT.replace('[0, 0]', '[3, -2]') } as JsxState
    await fixture.whenStable()

    expect(position('M')).toEqual([3, -2])
    expect(state().points['M']).toEqual({ x: 3, y: -2 })
  })

  it('suit les déplacements de l’apprenant', async () => {
    await setup()
    point('M').setPosition(JXG.COORDS_BY_USER, [2, 2])
    board().update()

    expect(state().points['M']).toEqual({ x: 2, y: 2 })
    expect(state().isFilled).toBe(true)
  })
})

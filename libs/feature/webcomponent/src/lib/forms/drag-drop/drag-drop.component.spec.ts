import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { DragDropState } from './drag-drop'
import { DragDropComponent } from './drag-drop.component'
import { DragDropDirective } from './drag-drop.directive'
import { DragDropService } from './drag-drop.service'

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

describe('DragDropComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DragDropComponent], providers: [DragDropService] })
      .overrideComponent(DragDropComponent, {
        set: { imports: [CommonModule, CssPipeModule, DragDropDirective, BaseStubComponent, MarkdownStubComponent] },
      })
      .compileComponents()
  })

  /** Crée une étiquette (`draggable`) ou une zone de dépôt. */
  function create(state: Partial<DragDropState>): DragDropComponent {
    const fixture = TestBed.createComponent(DragDropComponent)
    fixture.componentInstance.state = { group: 'plantes', ...state } as DragDropState
    fixture.detectChanges()
    return fixture.componentInstance
  }

  const label = (content: string) => create({ draggable: true, content })
  const zone = (content = '') => create({ content, isFilled: !!content })

  /** Dépose `source` sur `destination` (l'événement est émis par la destination). */
  function drop(source: DragDropComponent, destination: DragDropComponent) {
    destination.dropped({ source: source.directive.id, destination: destination.directive.id })
  }

  const contents = (...components: DragDropComponent[]) => components.map((c) => c.state.content)
  const filled = (...components: DragDropComponent[]) => components.map((c) => c.state.isFilled)

  it("copie une étiquette d'origine, qui peut remplir plusieurs zones", () => {
    const toxique = label('Toxique')
    const [a, b] = [zone(), zone()]

    drop(toxique, a)
    drop(toxique, b)

    expect(contents(toxique, a, b)).toEqual(['Toxique', 'Toxique', 'Toxique'])
    expect(filled(a, b)).toEqual([true, true])
  })

  it('déplace le contenu d’une zone vers une zone vide', () => {
    const [a, b] = [zone('Toxique'), zone()]

    drop(a, b)

    expect(contents(a, b)).toEqual(['', 'Toxique'])
    expect(filled(a, b)).toEqual([false, true])
  })

  it('échange le contenu de deux zones remplies', () => {
    const [a, b] = [zone('Toxique'), zone('Comestible')]

    drop(a, b)

    expect(contents(a, b)).toEqual(['Comestible', 'Toxique'])
    expect(filled(a, b)).toEqual([true, true])
  })

  it('vide une zone ramenée sur son étiquette d’origine', () => {
    const toxique = label('Toxique')
    const a = zone('Toxique')

    drop(a, toxique)

    expect(contents(toxique, a)).toEqual(['Toxique', ''])
    expect(filled(a)).toEqual([false])
  })

  it("refuse un dépôt dans une zone d'un autre groupe", () => {
    const a = zone('Toxique')
    const b = create({ group: 'autre' })

    drop(a, b)

    expect(contents(a, b)).toEqual(['Toxique', ''])
  })
})

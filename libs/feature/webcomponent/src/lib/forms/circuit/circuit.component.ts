import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
  inject,
} from '@angular/core'
import { deepEqual } from '@cisstech/nge/utils'
import { BaseModule } from '../../shared/components/base/base.module'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import { CircuitComponentDefinition, CircuitState } from './circuit'
import {
  Drawing,
  DrawnElement,
  Prim,
  SwitchInfo,
  nextState,
  normalizePositions,
  renderCircuit,
  switchInfos,
  elementsOf,
} from './circuit-render'

/** Groupe affiché : un élément du schéma, ou une couche sans interaction (fils, annotations). */
interface Layer {
  key: string
  element?: DrawnElement
  prims: Prim[]
}

@Component({
  selector: 'wc-circuit',
  templateUrl: 'circuit.component.html',
  styleUrls: ['circuit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule],
})
@WebComponent(CircuitComponentDefinition)
export class CircuitComponent implements WebComponentHooks<CircuitState> {
  readonly injector = inject(Injector)
  private readonly changeDetector = inject(WebComponentChangeDetectorService)
  private readonly cdr = inject(ChangeDetectorRef)

  @Input() state!: CircuitState
  @Output() stateChange = new EventEmitter<CircuitState>()

  protected drawing: Drawing = renderCircuit({ elements: [] })
  protected layers: Layer[] = []
  protected hasSwitches = false
  private infos = new Map<string, SwitchInfo>()

  /** Les interrupteurs peuvent-ils être manœuvrés ? */
  protected get interactive(): boolean {
    return !this.state.disabled
  }

  onChangeState() {
    const schema = this.state.schema ?? { elements: [] }
    this.infos = new Map(switchInfos(schema).map((s) => [s.id, s]))
    this.hasSwitches = [...this.infos.values()].some((s) => !s.fixed)
    // la valeur contient toujours la position de tous les interrupteurs
    const positions = normalizePositions(schema, this.state.value)
    if (!deepEqual(positions, this.state.value)) {
      this.state.value = positions
    }
    this.redraw(positions)
  }

  /** Clic gauche ou touche Entrée/Espace : position suivante de l'interrupteur. */
  protected async toggle(element: DrawnElement | undefined, event?: Event): Promise<void> {
    if (!element || !element.switchable || !this.interactive) return
    event?.preventDefault()
    const info = this.infos.get(element.id)
    if (!info) return
    const positions = normalizePositions(this.state.schema, this.state.value)
    positions[info.id] = nextState(info, positions[info.id])
    this.redraw(positions)
    await this.changeDetector.ignore(this, () => {
      // une seule affectation : l'état est un proxy qui déclenche la détection de changements
      this.state.value = positions
      this.state.isFilled = true
    })
    this.cdr.markForCheck()
  }

  protected async onKey(element: DrawnElement | undefined, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      await this.toggle(element, event)
    }
  }

  protected trackLayer(_: number, layer: Layer) {
    return layer.key
  }

  /** Description du schéma pour les lecteurs d'écran. */
  protected get ariaLabel(): string {
    const n = elementsOf(this.state.schema).length
    const base = this.state.caption || 'Schéma électrique'
    return this.hasSwitches && this.interactive
      ? `${base} (${n} éléments). Les interrupteurs sont des boutons : Entrée ou Espace change leur position.`
      : `${base} (${n} éléments)`
  }

  private redraw(positions: Record<string, number>) {
    const schema = this.state.schema ?? { elements: [] }
    // l'échelle du composant multiplie celle éventuellement fixée dans le schéma (comme circuitToSvg)
    this.drawing = renderCircuit(schema, positions, {
      scale: (Number(this.state.scale) || 1) * (Number((schema as any).scale) || 1),
    })
    this.layers = [
      { key: 'wires', prims: this.drawing.wires },
      ...this.drawing.elements.map((e) => ({ key: e.key, element: e, prims: e.prims })),
      { key: 'overlay', prims: this.drawing.overlay },
    ]
  }
}

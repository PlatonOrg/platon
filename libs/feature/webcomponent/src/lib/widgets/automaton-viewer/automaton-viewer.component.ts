import { ChangeDetectionStrategy, Component, Injector, Input, inject } from '@angular/core'
import { automatonToDotFormat, parseAutomaton } from '../../forms/automaton-editor/automaton'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { AutomatonViewerComponentDefinition, type AutomatonViewerState } from './automaton-viewer'
import { RenderDotModule } from '../../shared/directives/render-dot.directive'
import { BaseModule } from '../../shared/components/base/base.module'

@Component({
  selector: 'wc-automaton-viewer',
  templateUrl: 'automaton-viewer.component.html',
  styleUrls: ['automaton-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, RenderDotModule],
})
@WebComponent(AutomatonViewerComponentDefinition)
export class AutomatonViewerComponent implements WebComponentHooks<AutomatonViewerState> {
  readonly injector = inject(Injector)

  @Input() state!: AutomatonViewerState

  dot?: string

  onChangeState() {
    if (!this.state.automaton) {
      console.warn('No automaton to display')
      return
    }
    this.dot = automatonToDotFormat(parseAutomaton(this.state.automaton))
  }
}

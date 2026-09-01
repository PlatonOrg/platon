import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output, inject } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentService } from '../../web-component.service'
import { EvaluatorComponentDefinition, type EvaluatorState } from './evaluator'
import { BaseModule } from '../../shared/components/base/base.module'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { NzRateModule } from 'ng-zorro-antd/rate'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'

@Component({
  selector: 'wc-evaluator',
  templateUrl: 'evaluator.component.html',
  styleUrls: ['evaluator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, CssPipeModule, NzIconModule, NzRateModule, FormsModule, MatCardModule],
})
@WebComponent(EvaluatorComponentDefinition)
export class EvaluatorComponent implements WebComponentHooks<EvaluatorState> {
  readonly injector = inject(Injector)

  private readonly webComponentService!: WebComponentService

  @Input() state!: EvaluatorState
  @Output() stateChange = new EventEmitter<EvaluatorState>()

  constructor() {
    const injector = this.injector

    this.webComponentService = injector.get(WebComponentService)!
  }

  onChangeState() {
    if (typeof this.state.width === 'number') {
      this.state.width = `${this.state.width}px`
    }
    if (typeof this.state.height === 'number') {
      this.state.height = `${this.state.height}px`
    }
  }

  protected autoValidate() {
    if (this.state.autoValidation && this.state.value) {
      this.webComponentService.submit(this)
    }
  }

  protected getIcon(index: number): string {
    if (Array.isArray(this.state.icons)) {
      const validIndex = index % this.state.icons.length
      return this.state.icons[validIndex]
    } else {
      return this.state.icons
    }
  }
}

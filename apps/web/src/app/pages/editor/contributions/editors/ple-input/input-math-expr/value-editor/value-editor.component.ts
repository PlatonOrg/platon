import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MathLiveState } from '@platon/feature/webcomponent'
import { BaseValueEditor } from '../../ple-input'

@Component({
  selector: 'app-input-math-expr-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueEditorComponent extends BaseValueEditor<string> {
  private previousValue?: string

  constructor() {
    super()
  }

  override setValue(value: string): void {
    this.previousValue = value
    super.setValue(value)
  }

  protected handleValueChange(newValue: string): void {
    if (this.previousValue === newValue) {
      return
    }
    this.previousValue = newValue
    this.notifyValueChange?.(newValue)
  }
}

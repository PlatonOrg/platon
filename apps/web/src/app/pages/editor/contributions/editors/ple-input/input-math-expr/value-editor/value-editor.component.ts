import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { BaseValueEditor } from '../../ple-input'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'

@Component({
  selector: 'app-input-math-expr-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

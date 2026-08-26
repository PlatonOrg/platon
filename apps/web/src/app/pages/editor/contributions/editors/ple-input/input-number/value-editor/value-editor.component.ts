import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseValueEditor } from '../../ple-input'
import { InputNumberOptions } from '../input-number'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'

@Component({
  selector: 'app-input-number-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputNumberModule],
})
export class ValueEditorComponent extends BaseValueEditor<number, InputNumberOptions> {
  readonly minSafeInteger = Number.MIN_SAFE_INTEGER
  readonly maxSafeInteger = Number.MAX_SAFE_INTEGER

  constructor() {
    super()
  }

  override setValue(value: number): void {
    super.setValue(this.convertToNumericValue(value))
  }
}

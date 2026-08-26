import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseValueEditor } from '../../ple-input'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'

@Component({
  selector: 'app-input-text-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule],
})
export class ValueEditorComponent extends BaseValueEditor<string> {
  constructor() {
    super()
  }

  override setValue(value: string): void {
    super.setValue(this.convertToTextValue(value))
  }
}

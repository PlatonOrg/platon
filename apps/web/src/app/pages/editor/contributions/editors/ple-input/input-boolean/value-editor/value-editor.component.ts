import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseValueEditor } from '../../ple-input'

import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzSwitchModule } from 'ng-zorro-antd/switch'

@Component({
  selector: 'app-input-boolean-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzFormModule, NzSwitchModule],
})
export class ValueEditorComponent extends BaseValueEditor<boolean> {
  constructor() {
    super()
  }

  override setValue(value: boolean): void {
    super.setValue(this.convertToBooleanValuee(value))
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseConfigEditor } from '../../ple-input'
import { InputNumberOptions } from '../input-number'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'

@Component({
  selector: 'app-input-number-config-editor',
  templateUrl: 'config-editor.component.html',
  styleUrls: ['config-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputNumberModule],
})
export class ConfigEditorComponent extends BaseConfigEditor<InputNumberOptions> {
  constructor() {
    super()
  }
}

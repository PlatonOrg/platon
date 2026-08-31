import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseConfigEditor } from '../../ple-input'
import { InputListOptions } from '../input-list'

import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'

@Component({
  selector: 'app-input-list-config-editor',
  templateUrl: 'config-editor.component.html',
  styleUrls: ['config-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzFormModule, NzCheckboxModule, NzSelectModule, NzInputModule],
})
export class ConfigEditorComponent extends BaseConfigEditor<InputListOptions> {
  constructor() {
    super()
  }
}

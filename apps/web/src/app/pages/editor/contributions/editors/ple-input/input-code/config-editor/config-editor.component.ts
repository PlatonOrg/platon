import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseConfigEditor } from '../../ple-input'
import { InputCodeOptions } from '../input-code'

import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzSelectModule } from 'ng-zorro-antd/select'

@Component({
  selector: 'app-input-code-config-editor',
  templateUrl: 'config-editor.component.html',
  styleUrls: ['config-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzFormModule, NzSelectModule],
})
export class ConfigEditorComponent extends BaseConfigEditor<InputCodeOptions> {
  readonly languages = monaco.languages.getLanguages()
  constructor() {
    super()
  }
}

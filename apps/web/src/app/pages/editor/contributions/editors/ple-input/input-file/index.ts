import { CommonModule } from '@angular/common'
import { NgModule, Provider } from '@angular/core'
import { EditorDirectivesModule } from '@cisstech/nge-ide/core'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { HideResourceIdPipe, ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [CommonModule, NzButtonModule, NzIconModule, NzToolTipModule, EditorDirectivesModule],
  exports: [ValueEditorComponent],
  declarations: [ValueEditorComponent, HideResourceIdPipe],
})
export class InputFileModule {}

export const InputFileProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'file',
    label: 'Fichier',
    defaultValue: () => '',
    canHandle: (input) =>
      input.type
        ? input.type === 'file'
        : typeof input.value === 'string' && input.value.match(/@copycontent|@copyurl/g),
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

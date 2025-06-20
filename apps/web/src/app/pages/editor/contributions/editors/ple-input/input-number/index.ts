import { CommonModule } from '@angular/common'
import { NgModule, Provider } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ConfigEditorComponent } from './config-editor/config-editor.component'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [CommonModule, FormsModule, NzFormModule, NzInputNumberModule],
  exports: [ValueEditorComponent, ConfigEditorComponent],
  declarations: [ValueEditorComponent, ConfigEditorComponent],
})
export class InputNumberModule {}

export const InputNumberProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'number',
    label: 'Nombre',
    defaultValue: () => 0,
    canHandle: (input) => (input.type ? input.type === 'number' : typeof input.value === 'number'),
    valueEditor: ValueEditorComponent,
    configEditor: ConfigEditorComponent,
  } as PleInputProvider,
}

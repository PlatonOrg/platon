import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ConfigEditorComponent } from './config-editor/config-editor.component'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent, ConfigEditorComponent],
  exports: [ValueEditorComponent, ConfigEditorComponent],
  declarations: [],
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

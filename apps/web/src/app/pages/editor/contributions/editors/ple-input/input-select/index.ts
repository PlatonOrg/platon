import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ConfigEditorComponent } from './config-editor/config-editor.component'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent, ConfigEditorComponent],
  exports: [ValueEditorComponent, ConfigEditorComponent],
  declarations: [],
})
export class InputSelectModule {}

export const InputSelectProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'select',
    label: 'Select',
    defaultValue: () => undefined,
    canHandle: (input) => input.type === 'select',
    valueEditor: ValueEditorComponent,
    configEditor: ConfigEditorComponent,
  } as PleInputProvider,
}

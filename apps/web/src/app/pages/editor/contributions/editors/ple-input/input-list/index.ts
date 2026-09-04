import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ValueEditorComponent } from './value-editor/value-editor.component'
import { ConfigEditorComponent } from './config-editor/config-editor.component'

@NgModule({
  imports: [ValueEditorComponent, ConfigEditorComponent],
  exports: [ValueEditorComponent, ConfigEditorComponent],
  declarations: [],
})
export class InputListModule {}

export const InputListProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'list',
    label: 'Liste',
    defaultValue: () => [],
    canHandle: (input) => input.type === 'list',
    valueEditor: ValueEditorComponent,
    configEditor: ConfigEditorComponent,
  } as PleInputProvider,
}

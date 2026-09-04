import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputBooleanModule {}

export const InputBooleanProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'boolean',
    label: 'Boolean',
    defaultValue: () => false,
    canHandle: (input) => (input.type ? input.type === 'boolean' : typeof input.value === 'boolean'),
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

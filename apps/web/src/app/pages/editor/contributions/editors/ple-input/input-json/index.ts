import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputJsonModule {}

export const InputJsonProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'json',
    label: 'JSON',
    defaultValue: () => ({}),
    canHandle: (input) => (input.type ? input.type === 'json' : typeof input.value === 'object'),
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

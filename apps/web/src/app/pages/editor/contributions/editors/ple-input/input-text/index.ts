import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputTextModule {}

export const InputTextProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'text',
    label: 'Texte',
    defaultValue: () => '',
    canHandle: (input) => (input.type ? input.type === 'text' : typeof input.value === 'string'),
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

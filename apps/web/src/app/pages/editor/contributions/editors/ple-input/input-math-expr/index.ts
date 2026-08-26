import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputMathExprModule {}

export const InputMathExprProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'mathexpr',
    label: 'Expression mathématique',
    defaultValue: () => '',
    canHandle: (input) => input.type === 'mathexpr',
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

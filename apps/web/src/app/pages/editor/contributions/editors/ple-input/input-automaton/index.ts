import { NgModule, Provider } from '@angular/core'
import { emptyAutomaton } from '@platon/feature/webcomponent'

import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputAutomatonModule {}

export const InputAutomatonProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'automaton',
    label: 'Automate',
    defaultValue: () => emptyAutomaton(),
    canHandle: (input) => input.type === 'automaton',
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

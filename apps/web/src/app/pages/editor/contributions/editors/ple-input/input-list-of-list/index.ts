import { NgModule, Provider } from '@angular/core'
import { ValueEditorComponent } from './value-editor/value-editor.component'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { InputListOfList } from './input-list-of-list'

@NgModule({
  imports: [ValueEditorComponent],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputListOfListModule {}

export const InputListOfListProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'listOfList',
    label: 'Liste de listes',
    defaultValue: () => [] as InputListOfList[],
    canHandle: (input) => input.type === 'listOfList',
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

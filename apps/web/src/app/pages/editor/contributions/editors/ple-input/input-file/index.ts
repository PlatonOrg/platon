import { NgModule, Provider } from '@angular/core'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { HideResourceIdPipe, ValueEditorComponent } from './value-editor/value-editor.component'

@NgModule({
  imports: [ValueEditorComponent, HideResourceIdPipe],
  exports: [ValueEditorComponent],
  declarations: [],
})
export class InputFileModule {}

export const InputFileProvider: Provider = {
  provide: PLE_INPUT_PROVIDERS,
  multi: true,
  useValue: {
    type: 'file',
    label: 'Fichier',
    defaultValue: () => '',
    canHandle: (input) =>
      input.type
        ? input.type === 'file'
        : typeof input.value === 'string' && input.value.match(/@copycontent|@copyurl/g),
    valueEditor: ValueEditorComponent,
  } as PleInputProvider,
}

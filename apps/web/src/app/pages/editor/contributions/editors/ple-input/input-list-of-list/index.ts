import { CommonModule } from '@angular/common'
import { NgModule, Provider } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { UiTagListComponent } from '@platon/shared/ui'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'
import { ValueEditorComponent } from './value-editor/value-editor.component'
import { PLE_INPUT_PROVIDERS, PleInputProvider } from '../ple-input'
import { InputListOfList } from './input-list-of-list'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzCheckboxModule,
    NzSelectModule,
    NzInputModule,
    NzIconModule,
    UiTagListComponent,
  ],
  exports: [ValueEditorComponent],
  declarations: [ValueEditorComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

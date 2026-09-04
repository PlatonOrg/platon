import { NgModule } from '@angular/core'

import { InputAutomatonModule } from './input-automaton'
import { InputBooleanModule } from './input-boolean'
import { InputCodeModule } from './input-code'
import { InputFileModule } from './input-file'
import { InputGroupComponent } from './input-group/input-group.component'
import { InputJsonModule } from './input-json'
import { InputListModule } from './input-list'
import { InputMathExprModule } from './input-math-expr'
import { InputNumberModule } from './input-number'
import { InputSelectModule } from './input-select'
import { InputTextModule } from './input-text'
import { PleInputComponent } from './ple-input.component'

@NgModule({
  imports: [
    InputCodeModule,
    InputJsonModule,
    InputTextModule,
    InputFileModule,
    InputNumberModule,
    InputBooleanModule,
    InputSelectModule,
    InputListModule,
    InputMathExprModule,
    InputAutomatonModule,
    InputGroupComponent,
    PleInputComponent,
  ],
  exports: [PleInputComponent, InputGroupComponent],
})
export class PleInputEditorModule {}

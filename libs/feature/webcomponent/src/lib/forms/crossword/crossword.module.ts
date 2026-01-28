import { NgModule, Type } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'

import { IDynamicModule } from '@cisstech/nge/services'

import { IconGrPipe } from '@cisstech/nge/pipes'
import { BaseModule } from '../../shared/components/base/base.module'
import { MatIconModule } from '@angular/material/icon'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { CrosswordComponent } from './crossword.component'

@NgModule({
  declarations: [CrosswordComponent],
  imports: [
    BaseModule,
    IconGrPipe,

    FormsModule,
    ReactiveFormsModule,

    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatIconModule,

    CssPipeModule,

    NzPopoverModule,
  ],
  exports: [CrosswordComponent],
})
export class CrosswordModule implements IDynamicModule {
  component: Type<unknown> = CrosswordComponent
}

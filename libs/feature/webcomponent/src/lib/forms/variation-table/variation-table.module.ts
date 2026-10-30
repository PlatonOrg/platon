import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { VariationTableComponent } from './variation-table.component'

@NgModule({
  declarations: [],
  imports: [VariationTableComponent],
  exports: [VariationTableComponent],
})
export class VariationTableModule implements IDynamicModule {
  component: Type<unknown> = VariationTableComponent
}
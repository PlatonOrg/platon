import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { CrosswordComponent } from './crossword.component'

@NgModule({
  declarations: [],
  imports: [CrosswordComponent],
  exports: [CrosswordComponent],
})
export class CrosswordModule implements IDynamicModule {
  component: Type<unknown> = CrosswordComponent
}

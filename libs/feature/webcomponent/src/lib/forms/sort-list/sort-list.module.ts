import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { SortListComponent } from './sort-list.component'

@NgModule({
  declarations: [],
  imports: [SortListComponent],
  exports: [SortListComponent],
})
export class SortListModule implements IDynamicModule {
  component: Type<unknown> = SortListComponent
}

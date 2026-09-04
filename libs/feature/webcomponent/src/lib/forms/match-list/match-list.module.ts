import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { MatchListComponent } from './match-list.component'

@NgModule({
  declarations: [],
  imports: [MatchListComponent],
  exports: [MatchListComponent],
})
export class MatchListModule implements IDynamicModule {
  component: Type<unknown> = MatchListComponent
}

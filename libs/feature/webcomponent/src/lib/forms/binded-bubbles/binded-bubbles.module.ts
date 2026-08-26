import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { BindedBubblesComponent } from './binded-bubbles.component'

@NgModule({
  declarations: [],
  imports: [BindedBubblesComponent],
  exports: [BindedBubblesComponent],
})
export class BindedBubblesModule implements IDynamicModule {
  component: Type<unknown> = BindedBubblesComponent
}

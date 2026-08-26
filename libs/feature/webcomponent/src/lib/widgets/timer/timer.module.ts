import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { TimerComponent } from './timer.component'

@NgModule({
  declarations: [],
  imports: [TimerComponent],
  exports: [TimerComponent],
})
export class TimerModule implements IDynamicModule {
  component: Type<unknown> = TimerComponent
}

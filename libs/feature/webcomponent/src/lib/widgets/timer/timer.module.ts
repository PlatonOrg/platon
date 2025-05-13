import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { BaseModule } from '../../shared/components/base/base.module'
import { TimerComponent } from './timer.component'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

@NgModule({
  declarations: [TimerComponent],
  imports: [BaseModule, NgeMarkdownModule],
  exports: [TimerComponent],
})
export class TimerModule implements IDynamicModule {
  component: Type<unknown> = TimerComponent
}

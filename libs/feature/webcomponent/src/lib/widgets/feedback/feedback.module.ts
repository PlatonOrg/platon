import { NgModule, Type } from '@angular/core'

import { FeedbackComponent } from './feedback.component'
import { IDynamicModule } from '@cisstech/nge/services'

@NgModule({
  declarations: [],
  imports: [FeedbackComponent],
  exports: [FeedbackComponent],
})
export class FeedbackModule implements IDynamicModule {
  component: Type<unknown> = FeedbackComponent
}

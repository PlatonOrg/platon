import { NgModule, Type } from '@angular/core'
import { FoldableFeedbackComponent } from './foldable-feedback.component'
import { IDynamicModule } from '@cisstech/nge/services'

@NgModule({
  declarations: [],
  imports: [FoldableFeedbackComponent],
  exports: [FoldableFeedbackComponent],
})
export class FoldableFeedbackModule implements IDynamicModule {
  component: Type<unknown> = FoldableFeedbackComponent
}

import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { EvaluatorComponent } from './evaluator.component'

@NgModule({
  declarations: [],
  imports: [EvaluatorComponent],
  exports: [EvaluatorComponent],
})
export class EvaluatorModule implements IDynamicModule {
  component: Type<unknown> = EvaluatorComponent
}

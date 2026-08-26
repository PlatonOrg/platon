import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { MathLiveComponent } from './math-live.component'

@NgModule({
  declarations: [],
  imports: [MathLiveComponent],
  exports: [MathLiveComponent],
})
export class MathLiveModule implements IDynamicModule {
  component: Type<unknown> = MathLiveComponent
}

import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { CircuitComponent } from './circuit.component'

@NgModule({
  declarations: [],
  imports: [CircuitComponent],
  exports: [CircuitComponent],
})
export class CircuitModule implements IDynamicModule {
  component: Type<unknown> = CircuitComponent
}

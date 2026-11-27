import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { InputBoxComponent } from './input-box.component'

@NgModule({
  declarations: [],
  imports: [InputBoxComponent],
  exports: [InputBoxComponent],
})
export class InputBoxModule implements IDynamicModule {
  component: Type<unknown> = InputBoxComponent
}

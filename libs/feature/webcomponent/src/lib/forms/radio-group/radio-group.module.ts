import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { RadioGroupComponent } from './radio-group.component'

@NgModule({
  declarations: [],
  imports: [RadioGroupComponent],
  exports: [RadioGroupComponent],
})
export class RadioGroupModule implements IDynamicModule {
  component: Type<unknown> = RadioGroupComponent
}

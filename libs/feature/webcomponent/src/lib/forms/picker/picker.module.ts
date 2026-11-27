import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { PickerComponent } from './picker.component'

@NgModule({
  declarations: [],
  imports: [PickerComponent],
  exports: [PickerComponent],
})
export class PickerModule implements IDynamicModule {
  component: Type<unknown> = PickerComponent
}

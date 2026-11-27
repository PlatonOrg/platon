import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { CheckboxGroupComponent } from './checkbox-group.component'

@NgModule({
  declarations: [],
  imports: [CheckboxGroupComponent],
  exports: [CheckboxGroupComponent],
})
export class CheckboxGroupModule implements IDynamicModule {
  component: Type<unknown> = CheckboxGroupComponent
}

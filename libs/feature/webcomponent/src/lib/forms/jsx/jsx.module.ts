import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { JsxComponent } from './jsx.component'

@NgModule({
  declarations: [],
  imports: [JsxComponent],
  exports: [JsxComponent],
})
export class JsxModule implements IDynamicModule {
  component: Type<unknown> = JsxComponent
}

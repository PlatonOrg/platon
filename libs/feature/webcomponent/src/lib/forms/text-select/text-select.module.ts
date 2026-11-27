import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { CssPipe } from '../../shared/pipes/css.pipe'
import { TextSelectComponent } from './text-select.component'

@NgModule({
  declarations: [],
  imports: [TextSelectComponent],
  exports: [TextSelectComponent],
  providers: [CssPipe],
})
export class TextSelectModule implements IDynamicModule {
  component: Type<unknown> = TextSelectComponent
}

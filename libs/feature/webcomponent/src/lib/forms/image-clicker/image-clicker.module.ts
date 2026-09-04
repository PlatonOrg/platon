import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { ImageClickerComponent } from './image-clicker.component'

@NgModule({
  declarations: [],
  imports: [ImageClickerComponent],
  exports: [ImageClickerComponent],
})
export class ImageClickerModule implements IDynamicModule {
  component: Type<unknown> = ImageClickerComponent
}

import { NgModule, Type } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'

import { IDynamicModule } from '@cisstech/nge/services'

import { BaseModule } from '../../shared/components/base/base.module'
import { ImageClickerComponent } from './image-clicker.component'

@NgModule({
  declarations: [ImageClickerComponent],
  imports: [BaseModule],
  exports: [ImageClickerComponent],
})
export class ImageClickerModule implements IDynamicModule {
  component: Type<unknown> = ImageClickerComponent
}

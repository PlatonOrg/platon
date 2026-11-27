import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { DragDropComponent } from './drag-drop.component'
import { DragDropDirective } from './drag-drop.directive'
import { DragDropService } from './drag-drop.service'

@NgModule({
  declarations: [],
  imports: [DragDropComponent, DragDropDirective],
  exports: [DragDropComponent],
  providers: [DragDropService],
})
export class DragDropModule implements IDynamicModule {
  component: Type<unknown> = DragDropComponent
}

import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { AutomatonViewerComponent } from './automaton-viewer.component'

@NgModule({
  declarations: [],
  imports: [AutomatonViewerComponent],
  exports: [AutomatonViewerComponent],
})
export class AutomatonViewerModule implements IDynamicModule {
  component: Type<unknown> = AutomatonViewerComponent
}

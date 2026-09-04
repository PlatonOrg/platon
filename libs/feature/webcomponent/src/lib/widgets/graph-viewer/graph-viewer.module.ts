import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { GraphViewerComponent } from './graph-viewer.component'

@NgModule({
  declarations: [],
  imports: [GraphViewerComponent],
  exports: [GraphViewerComponent],
})
export class GraphViewerModule implements IDynamicModule {
  component: Type<unknown> = GraphViewerComponent
}

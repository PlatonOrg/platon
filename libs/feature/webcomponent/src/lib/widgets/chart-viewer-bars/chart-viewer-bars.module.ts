import { NgModule, Type } from '@angular/core'
import { ChartViewerBarsComponent } from './chart-viewer-bars.component'
import { IDynamicModule } from '@cisstech/nge/services'

@NgModule({
  declarations: [],
  imports: [ChartViewerBarsComponent],
  exports: [ChartViewerBarsComponent],
})
export class ChartViewerBarsModule implements IDynamicModule {
  component: Type<unknown> = ChartViewerBarsComponent
}

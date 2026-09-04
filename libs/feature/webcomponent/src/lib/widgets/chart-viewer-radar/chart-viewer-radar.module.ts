import { NgModule, Type } from '@angular/core'
import { ChartViewerRadarComponent } from './chart-viewer-radar.component'
import { IDynamicModule } from '@cisstech/nge/services'

@NgModule({
  declarations: [],
  imports: [ChartViewerRadarComponent],
  exports: [ChartViewerRadarComponent],
})
export class ChartViewerRadarModule implements IDynamicModule {
  component: Type<unknown> = ChartViewerRadarComponent
}

import { NgModule, Type } from '@angular/core'
import { ChartViewerPiesComponent } from './chart-viewer-pies.component'
import { IDynamicModule } from '@cisstech/nge/services'

@NgModule({
  declarations: [],
  imports: [ChartViewerPiesComponent],
  exports: [ChartViewerPiesComponent],
})
export class ChartViewerPiesModule implements IDynamicModule {
  component: Type<unknown> = ChartViewerPiesComponent
}

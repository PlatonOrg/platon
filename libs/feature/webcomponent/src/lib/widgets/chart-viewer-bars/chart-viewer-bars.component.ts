import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, inject } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { EChartsOption } from 'echarts'
import {
  ChartViewerBarsComponentDefinition,
  type ChartViewerBarsState,
  chartViewerBarsOption,
} from './chart-viewer-bars'
import { NgeMonacoModule } from '@cisstech/nge/monaco'
import { BaseModule } from '../../shared/components/base/base.module'
import { NgxEchartsModule } from 'ngx-echarts'

@Component({
  selector: 'wc-chart-viewer-bars, wc-cv-bars',
  templateUrl: './chart-viewer-bars.component.html',
  styleUrls: ['chart-viewer-bars.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, NgeMonacoModule, NgxEchartsModule],
})
@WebComponent(ChartViewerBarsComponentDefinition)
export class ChartViewerBarsComponent implements WebComponentHooks<ChartViewerBarsState> {
  readonly injector = inject(Injector)
  readonly changeDetectorRef = inject(ChangeDetectorRef)

  /** Replaces the whole option at each change, so that nothing remains from the previous mode. */
  protected option: EChartsOption = {}

  @Input() state!: ChartViewerBarsState

  onChangeState() {
    this.option = chartViewerBarsOption(this.state)
  }
}

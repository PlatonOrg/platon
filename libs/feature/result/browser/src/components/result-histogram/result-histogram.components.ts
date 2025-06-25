import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  inject,
  ViewChild,
} from '@angular/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

@Component({
  selector: 'result-histogram',
  templateUrl: './result-histogram.component.html',
  styleUrls: ['./result-histogram.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ResultHistogramComponent implements AfterViewInit {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef
  private chartInstance!: echarts.ECharts
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private _data: Map<string, number> = new Map<string, number>()

  @Input()
  set data(data: Map<string, number>) {
    this._data = data || new Map<string, number>()
    if (this.chartInstance) {
      this.drawChart()
      this.changeDetectorRef.detectChanges()
    }
  }

  constructor() {
    echarts.use([
      DatasetComponent,
      TitleComponent,
      TooltipComponent,
      GridComponent,
      TransformComponent,
      BarChart,
      CanvasRenderer,
      LabelLayout,
      UniversalTransition,
    ])
  }

  ngAfterViewInit() {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement)
    this.drawChart()

    setTimeout(() => {
      this.chartInstance.resize()
    }, 0)

    window.addEventListener('resize', () => {
      if (this.chartInstance) {
        this.chartInstance.resize()
      }
    })
  }

  private drawChart(): void {
    if (!this._data || this._data.size === 0) return

    const keys: string[] = []
    const values: number[] = []

    // Convert Map to arrays for ECharts
    this._data.forEach((value, key) => {
      keys.push(key)
      values.push(value)
    })

    const option = {
      title: {
        text: 'Distribution des valeurs',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: keys,
        axisTick: {
          alignWithLabel: true,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Valeur',
          type: 'bar',
          barWidth: '60%',
          data: values,
        },
      ],
    }

    this.chartInstance.setOption(option)
  }
}

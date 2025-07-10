import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, OnChanges, OnInit } from '@angular/core'
import { CoreEchartsDirective } from '@platon/core/browser'
import { EChartsOption } from 'echarts'
import type { ECharts } from 'echarts'

@Component({
  standalone: true,
  selector: 'result-histogram',
  templateUrl: './result-histogram.component.html',
  styleUrls: ['./result-histogram.component.scss'],
  imports: [CommonModule, CoreEchartsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultHistogramComponent implements OnInit, OnChanges {
  protected chart?: EChartsOption
  private echartInstance?: ECharts
  private sortedNotes: number[] = []

  @Input()
  data: number[] = []

  @Input()
  highlightedValue?: number

  @Output()
  highlightedValueChange: EventEmitter<number> = new EventEmitter<number>()

  ngOnInit() {
    this.initChart()
  }

  ngOnChanges() {
    this.chart = this.drawChart()
    if (this.echartInstance) {
      this.echartInstance.setOption(this.chart)
    }
  }

  onChartInit(ec: ECharts): void {
    this.echartInstance = ec
  }

  onChartClick(event: { dataIndex?: number }): void {
    const dataIndex = event.dataIndex
    if (dataIndex !== undefined && this.sortedNotes[dataIndex] !== undefined) {
      const clickedNote = this.sortedNotes[dataIndex]
      this.highlightedValueChange.emit(clickedNote)
      this.highlightedValue = clickedNote
      if (this.echartInstance) {
        this.echartInstance.setOption(this.drawChart())
      }
    }
  }

  private initChart(): void {
    this.chart = this.drawChart()
  }

  private drawChart(): EChartsOption {
    const noteMap = new Map<number, number>()
    for (const note of this.data) {
      if (typeof note === 'number') {
        const rounded = Math.round(note)
        noteMap.set(rounded, (noteMap.get(rounded) ?? 0) + 1)
      }
    }
    // Trier les notes croissantes
    this.sortedNotes = Array.from(noteMap.keys()).sort((a, b) => a - b)
    const counts = this.sortedNotes.map((n) => noteMap.get(n) ?? 0)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: {
        type: 'category',
        data: this.sortedNotes.map(String),
        name: 'Note',
        nameLocation: 'middle',
        nameGap: 24,
      },
      yAxis: {
        type: 'value',
        name: "Nombre d'étudiants",
        nameLocation: 'end',
        nameGap: 20,
        minInterval: 1,
      },
      series: [
        {
          name: "Nombre d'étudiants",
          type: 'bar',
          data: counts,
          itemStyle: {
            color: (params: { value: unknown; dataIndex: number }) => {
              const value = this.sortedNotes[params.dataIndex]
              if (
                value !== undefined &&
                this.highlightedValue !== undefined &&
                ((typeof this.highlightedValue === 'number' && value === this.highlightedValue) ||
                  (Array.isArray(this.highlightedValue) && this.highlightedValue.includes(value)))
              ) {
                return '#ff0026' // Highlight color
              }
              return '#5470c6' // Default color
            },
          },
          label: {
            show: true,
            position: 'top',
          },
        },
      ],
      grid: {
        left: '60',
        right: '40',
        bottom: '13%',
        containLabel: false,
      },
      title: { text: 'Répartition des notes', left: 'center' },
    }
  }
}

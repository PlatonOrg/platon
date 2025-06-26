import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
  AfterViewInit,
  HostListener,
  Output,
  EventEmitter,
  OnChanges,
} from '@angular/core'
import { EChartsOption } from 'echarts'
import { BarChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
@Component({
  standalone: true,
  selector: 'result-histogram',
  templateUrl: './result-histogram.component.html',
  styleUrls: ['./result-histogram.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultHistogramComponent implements AfterViewInit, OnChanges {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef
  private chartInstance!: echarts.ECharts

  @Input()
  data: number[] = []

  @Input()
  highlightedValue?: number

  @Output()
  highlightedValueChange: EventEmitter<number> = new EventEmitter<number>()

  ngAfterViewInit() {
    this.initChart()
    setTimeout(() => {
      this.chartInstance.resize()
    }, 0)
  }

  constructor() {
    echarts.use([GridComponent, BarChart, CanvasRenderer, TitleComponent, TooltipComponent])
  }

  ngOnChanges() {
    if (this.chartInstance) {
      this.drawChart()
    }
  }

  private initChart(): void {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement)
    this.drawChart()

    this.chartInstance.on('click', (params) => {
      if (params.componentType === 'series') {
        const clickedCategory = params.name
        if (clickedCategory !== undefined) {
          let numericValue: number | undefined = parseInt(clickedCategory)
          if (!isNaN(numericValue)) {
            if (this.highlightedValue === numericValue) {
              numericValue = undefined
            }
            this.highlightedValue = numericValue
            this.highlightedValueChange?.emit(this.highlightedValue)
            this.drawChart()
          }
        }
      }
    })
  }

  private drawChart(): void {
    // Afficher toutes les notes présentes dans data, sans xLabels prédéfinis
    const noteMap = new Map<number, number>()
    for (const note of this.data) {
      if (typeof note === 'number') {
        const rounded = Math.round(note)
        noteMap.set(rounded, (noteMap.get(rounded) ?? 0) + 1)
      }
    }
    // Trier les notes croissantes
    const sortedNotes = Array.from(noteMap.keys()).sort((a, b) => a - b)
    const counts = sortedNotes.map((n) => noteMap.get(n) ?? 0)

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: {
        type: 'category',
        data: sortedNotes.map(String),
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
              const value = sortedNotes[params.dataIndex]
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

    this.chartInstance.setOption(option)
  }

  @HostListener('window:resize')
  private onResize(): void {
    if (this.chartInstance) {
      this.chartInstance.resize()
    }
  }
}

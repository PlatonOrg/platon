import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, Input } from '@angular/core'
import { ExerciseResults } from '@platon/feature/result/common'
import { CommonModule } from '@angular/common'
import { CoreEchartsDirective } from '@platon/core/browser'
import { EChartsOption } from 'echarts'

@Component({
  selector: 'result-box-plot',
  templateUrl: './result-box-plot.component.html',
  styleUrls: ['./result-box-plot.component.scss'],
  imports: [CommonModule, CoreEchartsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ResultBoxPlotComponent {
  protected chart?: EChartsOption
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  @Input()
  set data(data: ExerciseResults[] | undefined) {
    this.chart = this.drawChart(data || [])
    this.changeDetectorRef.detectChanges()
  }

  drawChart(data: ExerciseResults[]): EChartsOption {
    // Préparation des données
    const preparedData = data.map((exercise) => {
      if (!exercise.details || exercise.details.length === 0) {
        return [0, 0, 0, 0, 0]
      }
      const sortedDetails = [...exercise.details].sort((a, b) => a - b)
      const min = sortedDetails[0]
      const Q1 = sortedDetails[Math.floor(sortedDetails.length / 4)]
      const median = sortedDetails[Math.floor(sortedDetails.length / 2)]
      const Q3 = sortedDetails[Math.floor((3 * sortedDetails.length) / 4)]
      const max = sortedDetails[sortedDetails.length - 1]
      return [min, Q1, median, Q3, max]
    })

    return {
      title: {
        text: 'Boxplot des résultats par exercice',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'shadow',
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        name: 'Exercices',
        data: data.map((exercise) => exercise.title),
        splitArea: {
          show: true,
        },
        axisLabel: {
          rotate: 25,
          fontSize: 10,
          interval: 0,
          formatter: (value: string) => (value.length > 17 ? value.slice(0, 17) + '...' : value),
        },
      },
      yAxis: {
        type: 'value',
        name: 'Score',
        min: -1,
        max: 100,
        splitArea: {
          show: true,
        },
      },
      grid: {
        show: true,
        bottom: 80,
      },
      series: [
        {
          name: 'Boxplot',
          type: 'boxplot',
          data: preparedData,
          colorBy: 'data',
          tooltip: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) =>
              `Min: ${params.data[1]}<br>Q1: ${params.data[2]}<br>Median: ${params.data[3]}<br>Q3: ${params.data[4]}<br>Max: ${params.data[5]}`,
          },
        },
      ],
    }
  }
}

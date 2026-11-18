import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'
import { ChartViewerBase2, ChartViewerBaseProperties2 } from '../../shared/components/chart-viewer/base'
import { EChartsOption } from 'echarts'

export interface ChartViewerBarsState extends IWebComponent, ChartViewerBase2 {
  mode: 'horizontal' | 'vertical'
  xAxisLabel: string
  yAxisLabel: string
  labels: string[]
}

export const ChartViewerBarsComponentDefinition = defineWebComponent({
  type: WebComponentTypes.widget,
  name: 'ChartViewer-Bars',
  selector: 'wc-chart-viewer-bars',
  description:
    "Graphique à barres horizontales ou verticales pour la visualisation comparative de données. Particulièrement utile pour les exercices d'économie, de statistiques, d'analyse de données séquentielles, de comparaison de performances sur différentes périodes, ou pour illustrer des distributions et tendances dans diverses disciplines scientifiques.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'ChartViewer-Bars',
    required: ['data'],
    properties: {
      mode: {
        type: 'string',
        default: 'vertical',
        description: "Sens des barres : vertical (barres verticales, les labels sous l'axe horizontal) ou horizontal",
        enum: ['horizontal', 'vertical'],
      },
      xAxisLabel: {
        type: 'string',
        default: '',
        description: "Titre de l'axe horizontal",
      },
      yAxisLabel: {
        type: 'string',
        default: '',
        description: "Titre de l'axe vertical",
      },
      labels: {
        type: 'array',
        default: [],
        description: 'Liste des labels',
        items: {
          type: 'string',
        },
      },
      ...ChartViewerBaseProperties2,
    },
  },
  showcase: {
    data: [
      {
        value: [4200, 3000, 20000, 35000, 50000, 18000],
        name: 'Allocated Budget',
      },
      {
        value: [5000, 14000, 28000, 26000, 42000, 21000],
        name: 'Actual Spending',
      },
    ],
    labels: ['Sales', 'Administration', 'Information Technology', 'Customer Support', 'Development', 'Marketing'],
  },
  playgrounds: {
    'Lire un diagramme en barres': 'best-month.ple',
  },
})

/**
 * Builds the ECharts option of a bar chart from the state of the component.
 *
 * In `vertical` mode, the bars rise from the horizontal axis, which holds the `labels`.
 * In `horizontal` mode, they extend from the vertical axis, which holds the `labels`.
 * `xAxisLabel` is always the title of the horizontal axis and `yAxisLabel` the title of the vertical axis.
 * @param state The state of the component.
 * @returns A complete option, meant to replace the previous one.
 */
export const chartViewerBarsOption = (state: ChartViewerBarsState): EChartsOption => {
  const vertical = state.mode !== 'horizontal'
  const categoryAxis = { type: 'category' as const, data: state.labels ?? [], axisLabel: { interval: 0 } }
  const valueAxis = { type: 'value' as const }

  return {
    title: state.title,
    legend: state.legend,
    tooltip: state.tooltip,
    grid: {
      left: '3%',
      right: '4%',
      // Room for the axis titles, which are drawn outside the labels.
      top: state.yAxisLabel ? 80 : 60,
      bottom: state.xAxisLabel ? 40 : '3%',
      containLabel: true,
    },
    xAxis: {
      ...(vertical ? categoryAxis : valueAxis),
      // Below the labels of the axis, which always have the height of a single line.
      ...(state.xAxisLabel ? { name: state.xAxisLabel, nameLocation: 'middle', nameGap: 30 } : {}),
    },
    yAxis: {
      ...(vertical ? valueAxis : categoryAxis),
      // Above the axis: the width of its labels is not known, the title could cover them on its left.
      ...(state.yAxisLabel ? { name: state.yAxisLabel, nameLocation: 'end' } : {}),
    },
    series: (state.data ?? []).map((serie) => ({ type: 'bar', name: serie.name, data: serie.value })),
  }
}

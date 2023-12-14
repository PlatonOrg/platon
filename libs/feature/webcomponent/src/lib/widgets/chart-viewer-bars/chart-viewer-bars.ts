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
  icon: 'assets/images/components/forms/code-editor/code-editor.svg',
  selector: 'wc-chart-viewer-bars',
  description: "Permets d'afficher une charte de type `histogramme` en fournissant des données",
  fullDescriptionUrl: 'assets/docs/components/widgets/chart-viewer-bars/chart-viewer-bars.md',
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'ChartViewer-Bars',
    required: ['data'],
    properties: {
      mode: {
        type: 'string',
        default: 'horizontal',
        description: "Mode d'affichage du graphe : horizontal ou vertical",
        enum: ['horizontal', 'vertical'],
      },
      xAxisLabel: {
        type: 'string',
        default: '',
        description: "Label de l'axe X",
      },
      yAxisLabel: {
        type: 'string',
        default: '',
        description: "Label de l'axe Y",
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
})

export const verticalChartViewerBarsState: EChartsOption = {
  title: {
    text: 'Waterfall Chart',
    subtext: 'Living Expenses in Shenzhen',
    left: 'center',
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    axisLabel: { interval: 0, rotate: 30 },
    data: [],
  },
  yAxis: {
    type: 'value',
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  series: [],
}

export const horizontalChartViewerBarsState: EChartsOption = {
  title: {
    text: 'Waterfall Chart',
    subtext: 'Living Expenses in Shenzhen',
    left: 'center',
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  yAxis: {
    type: 'category',
    axisLabel: { interval: 0, rotate: 30 },
    data: [],
  },
  xAxis: {
    type: 'value',
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  dataset: {
    source: [],
  },
  series: [],
}

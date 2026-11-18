import { ChartViewerBarsState, chartViewerBarsOption } from './chart-viewer-bars'

const state = (props: Partial<ChartViewerBarsState> = {}) =>
  ({
    mode: 'vertical',
    labels: ['Janvier', 'Février'],
    data: [
      { name: 'Magasin A', value: [10, 20] },
      { name: 'Magasin B', value: [30, 40] },
    ],
    ...props,
  } as ChartViewerBarsState)

describe('chartViewerBarsOption', () => {
  it('place les labels sous des barres verticales en mode vertical', () => {
    const option = chartViewerBarsOption(state({ mode: 'vertical' }))
    expect(option.xAxis).toMatchObject({ type: 'category', data: ['Janvier', 'Février'] })
    expect(option.yAxis).toMatchObject({ type: 'value' })
  })

  it('place les labels le long de l’axe vertical en mode horizontal', () => {
    const option = chartViewerBarsOption(state({ mode: 'horizontal' }))
    expect(option.xAxis).toMatchObject({ type: 'value' })
    expect(option.yAxis).toMatchObject({ type: 'category', data: ['Janvier', 'Février'] })
  })

  it('crée une série de barres par donnée', () => {
    expect(chartViewerBarsOption(state()).series).toEqual([
      { type: 'bar', name: 'Magasin A', data: [10, 20] },
      { type: 'bar', name: 'Magasin B', data: [30, 40] },
    ])
  })

  it.each(['vertical', 'horizontal'] as const)('donne les titres des axes horizontal et vertical (mode %s)', (mode) => {
    const option = chartViewerBarsOption(state({ mode, xAxisLabel: 'Mois', yAxisLabel: 'Ventes' }))
    expect(option.xAxis).toMatchObject({ name: 'Mois' })
    expect(option.yAxis).toMatchObject({ name: 'Ventes' })
  })

  it("n'affiche pas de titre d'axe vide", () => {
    const option = chartViewerBarsOption(state({ xAxisLabel: '', yAxisLabel: '' }))
    expect(option.xAxis).not.toHaveProperty('name')
    expect(option.yAxis).not.toHaveProperty('name')
  })

  it("ne garde rien de l'ancienne configuration (jeu de données vide, titre d'exemple)", () => {
    const option = chartViewerBarsOption(state({ title: { text: 'Ventes' } }))
    expect(option).not.toHaveProperty('dataset')
    expect(option.title).toEqual({ text: 'Ventes' })
  })
})

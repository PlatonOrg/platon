import {
  CircuitSchema,
  circuitToSvg,
  defaultLabel,
  elementPins,
  formatValue,
  junctionPoints,
  nextState,
  normalizePositions,
  parseLabel,
  renderCircuit,
  switchInfos,
  toInt,
  toNum,
  validateSchema,
} from './index'

const lampe = {
  unit: 40,
  elements: [
    { type: 'V', id: 'E', from: [0, 4], to: [0, 0], value: 12 },
    { type: 'switch', id: 'K1', from: [0, 0], to: [3, 0] },
    {
      type: 'wire',
      points: [
        [3, 0],
        [4, 0],
      ],
    },
    { type: 'selector', id: 'K2', at: [4, 0], labels: ['1', '2'] },
    { type: 'lamp', id: 'L1', from: [6, -1], to: [9, -1] },
    { type: 'lamp', id: 'L2', from: [6, 1], to: [9, 1] },
    {
      type: 'wire',
      points: [
        [9, -1],
        [10, -1],
        [10, 4],
        [0, 4],
      ],
    },
    {
      type: 'wire',
      points: [
        [9, 1],
        [10, 1],
      ],
    },
  ],
} as any

describe('circuit-render', () => {
  it('liste les interrupteurs et leurs positions', () => {
    const infos = switchInfos(lampe)
    expect(infos.map((i) => i.id)).toEqual(['K1', 'K2'])
    expect(infos[1].states).toEqual([0, 1])
    const withOff = switchInfos({
      elements: [{ type: 'selector', id: 'S', at: [0, 0], throws: 3, off: true, state: 2 }],
    })
    expect(withOff[0].states).toEqual([0, 1, 2, -1])
    expect(withOff[0].initial).toBe(2)
  })

  it('complète la valeur avec tous les interrupteurs et ignore les positions invalides', () => {
    expect(normalizePositions(lampe, {})).toEqual({ K1: 0, K2: 0 })
    expect(normalizePositions(lampe, { K1: 1, K2: 5, X: 1 })).toEqual({ K1: 1, K2: 0 })
    const fixed: CircuitSchema = {
      elements: [{ type: 'switch', id: 'K', from: [0, 0], to: [2, 0], state: 1, fixed: true }],
    }
    expect(normalizePositions(fixed, { K: 0 })).toEqual({ K: 1 })
  })

  it('fait défiler les positions au clic', () => {
    const info = switchInfos({ elements: [{ type: 'selector', id: 'S', at: [0, 0], throws: 3, off: true }] })[0]
    let s = info.initial
    const seen = []
    for (let i = 0; i < 5; i++) {
      s = nextState(info, s)
      seen.push(s)
    }
    expect(seen).toEqual([1, 2, -1, 0, 1])
  })

  it('calcule les broches des éléments tournés et retournés', () => {
    expect(elementPins({ type: 'opamp', at: [5, 1] })).toEqual({ inm: [3, 0], inp: [3, 2], out: [7, 1] })
    expect(elementPins({ type: 'opamp', at: [5, 1], flip: true })).toEqual({ inm: [3, 2], inp: [3, 0], out: [7, 1] })
    expect(elementPins({ type: 'selector', at: [9, 0], rot: 180 })).toEqual({ c: [9, 0], t0: [7, 1], t1: [7, -1] })
    expect(elementPins({ type: 'npn', at: [0, 4], rot: 90 })).toEqual({ B: [0, 3], C: [1, 4], E: [-1, 4] })
  })

  it('place les points de jonction (T) mais pas aux croisements', () => {
    expect(junctionPoints(lampe)).toEqual([[10, 1]])
    const crossing = {
      elements: [
        {
          type: 'wire',
          points: [
            [0, 0],
            [4, 0],
          ],
        },
        {
          type: 'wire',
          points: [
            [2, -2],
            [2, 2],
          ],
        },
      ],
    }
    expect(junctionPoints(crossing)).toEqual([])
  })

  it('signale les erreurs de description', () => {
    const errs = validateSchema({
      elements: [
        { type: 'R', id: 'R1', from: [0, 0], to: [0, 0] },
        { type: 'R', id: 'R1', from: [0, 0], to: [2, 0] },
        { type: 'switch', from: [0, 0], to: [2, 0] },
        { type: 'foo' },
      ],
    })
    expect(errs.length).toBe(4)
  })

  it('garde le cadrage du schéma malgré un attribut numérique mal écrit, et le signale', () => {
    const base = [
      { type: 'R', id: 'R1', from: [0, 0], to: [4, 0] },
      { type: 'R', id: 'R2', from: [0, 3], to: [8, 3] },
    ]
    const ref = renderCircuit({ elements: base } as CircuitSchema)
    const odd = [
      { type: 'text', at: [2, 2], text: 'x', size: 'big' },
      { type: 'varrow', from: [0, 0], to: [4, 0], offset: 'a', label: 'U' },
      { type: 'terminal', id: 'A', at: [0, 0], label_at: ['a', 1] },
      { type: 'block', id: 'B', at: [4, 6], h: 'x' },
    ]
    for (const extra of odd) {
      const d = renderCircuit({ elements: [...base, extra] } as CircuitSchema)
      expect(d.viewBox).not.toContain('NaN')
      expect(d.width).toBeGreaterThanOrEqual(ref.width)
      expect(d.errors.length).toBe(1)
    }
  })

  it('formate les valeurs à la française', () => {
    expect(formatValue(4700, 'Ω')).toBe('4,7 kΩ')
    expect(formatValue(1e-6, 'F')).toBe('1 µF')
    expect(formatValue(0.0025, 'A')).toBe('2,5 mA')
    expect(formatValue(12, 'V')).toBe('12 V')
  })

  it('découpe les libellés (indices, exposants, barre)', () => {
    expect(defaultLabel('R1')).toBe('R_1')
    expect(defaultLabel('Rb2')).toBe('R_{b2}')
    expect(parseLabel('V_{CC}')).toEqual([{ t: 'V' }, { t: 'CC', sub: true }])
    expect(parseLabel('\\overline{Q}')).toEqual([{ t: 'Q', over: true }])
    expect(parseLabel('\\omega_0')).toEqual([{ t: 'ω' }, { t: '0', sub: true }])
  })

  it("rend chaque élément et dessine l'interrupteur dans la position demandée", () => {
    const open = renderCircuit(lampe, { K1: 0, K2: 0 })
    const closed = renderCircuit(lampe, { K1: 1, K2: 1 })
    const k1 = (d: any) => d.elements.find((e: any) => e.id === 'K1')
    expect(k1(open).switchable).toBe(true)
    expect(k1(open).hit).toBeTruthy()
    expect(JSON.stringify(k1(open).prims)).not.toEqual(JSON.stringify(k1(closed).prims))
    expect(k1(closed).aria).toBe('Interrupteur K1 : fermé')
    expect(open.errors).toEqual([])
    expect(open.width).toBeGreaterThan(300)
    expect(circuitToSvg(lampe)).toContain('<svg')
  })

  it('ne donne pas de zone cliquable à un interrupteur fixe mais garde son état lisible', () => {
    const d = renderCircuit({
      elements: [{ type: 'switch', id: 'K', from: [0, 0], to: [2, 0], state: 1, fixed: true }],
    })
    const k = d.elements[0]
    expect(k.switchable).toBe(false)
    expect(k.hit).toBeUndefined()
    expect(k.aria).toBe('Interrupteur fixe K : fermé')
  })
})

// mêmes cas que tests/test_elec.py (test_ts_python_parity_on_odd_values, test_switch_state_...) :
// le dessin (TS) et la simulation (Python) doivent lire un schéma mal écrit de la même façon
describe('parité avec elec.py', () => {
  it('convertit les nombres comme _to_num', () => {
    expect(toNum('1')).toBe(1)
    expect(toNum(true)).toBe(1)
    expect(toNum(null)).toBeNaN()
    expect(toNum('')).toBeNaN()
    expect(toNum('0x10')).toBeNaN()
    expect(toNum('Infinity')).toBeNaN()
    expect(toNum([1])).toBeNaN()
    expect(toInt(2.5, [2, 3])).toBeNaN()
  })

  it('arrondit et valide les attributs comme Python', () => {
    const sel = { type: 'selector', id: 'S', at: [3, -2], rot: 45 }
    expect(elementPins(sel as any)['t0']).toEqual([4, 0])
    expect(Object.keys(elementPins({ type: 'and', at: [0, 0], inputs: 2.5 } as any))).toEqual(['a', 'b', 'out'])
    expect(Object.keys(elementPins({ type: 'selector', at: [0, 0], throws: '3' } as any))).toHaveLength(4)
    expect(elementPins({ type: 'block', at: [0, 0], w: null } as any)).toEqual({ in: [-1, 0], out: [1, 0] })
    const blk = elementPins({ type: 'block', at: [0, 0], pins: [{ at: [1, '2'] }, { name: null, at: [0, 1] }] } as any)
    expect(blk).toEqual({ p1: [0, 1] })
    expect(elementPins({ type: 'R', from: ['1', 2], to: [3, 2] } as any)).toEqual({ to: [3, 2] })
    const errs = validateSchema({ elements: [sel, { type: 'and', id: 'P', at: [0, 0], inputs: 2.5 }] })
    expect(errs.some((e) => e.includes('rot'))).toBe(true)
    expect(errs.some((e) => e.includes('inputs'))).toBe(true)
  })

  it('lit les positions des interrupteurs comme Python', () => {
    const s = {
      elements: [
        { type: 'switch', id: 1, from: [0, 0], to: [2, 0], state: '1' },
        { type: 'toggle', id: 'T', at: [0, 4], state: true },
      ],
    }
    expect(normalizePositions(s as any, {})).toEqual({ '1': 1, T: 1 })
    expect(normalizePositions(s as any, { '1': 0, T: false })).toEqual({ '1': 0, T: 0 })
    expect(normalizePositions(s as any, { '1': null, T: '' })).toEqual({ '1': 1, T: 1 })
    expect(normalizePositions(s as any, { '1': 'inf', T: 1.5 })).toEqual({ '1': 1, T: 1 })
  })
})

import {
  arrowGeometry,
  canInsert,
  canRemove,
  emptyCells,
  insertPoint,
  isColumnSplit,
  isNormalized,
  canToggleColumn,
  isLocked,
  nextArrow,
  nextMark,
  nextSign,
  normalizeRows,
  pointLevel,
  removePoint,
  setPointText,
  TableauRow,
  toggleColumnSplit,
  toggleSplit,
} from './variation-table.utils'

/** f(x) = x³ - 3x : x = -∞, -1, 1, +∞. */
const cubic = (): TableauRow[] =>
  normalizeRows([
    { type: 'x', label: 'x', points: ['-\\infty', '-1', '1', '+\\infty'], locked: ['p0', 'p3'] },
    { type: 'sign', label: "f'(x)", points: ['', '0', '0', ''], intervals: ['+', '-', '+'] },
    { type: 'variation', label: 'f(x)', points: ['-\\infty', '2', '-2', '+\\infty'], intervals: ['up', 'down', 'up'] },
  ])

describe('normalizeRows', () => {
  it('ajoute une ligne x et complète les cases manquantes', () => {
    const rows = normalizeRows([{ type: 'sign', label: 's', intervals: ['+'] }])
    expect(rows[0].type).toBe('x')
    expect(rows[0].points).toEqual(['', ''])
    expect(rows[1]).toEqual({ type: 'sign', label: 's', points: ['', ''], intervals: ['+'], locked: false })
  })

  it('ajuste chaque ligne au nombre de valeurs de x', () => {
    const rows = normalizeRows([
      { type: 'x', points: ['a', 'b', 'c'] },
      { type: 'variation', points: ['1'], intervals: ['up', 'down', 'up', 'down'] },
    ])
    expect(rows[1].points).toEqual(['1', '', ''])
    expect(rows[1].intervals).toEqual(['up', 'down'])
  })

  it('accepte les variantes usuelles et efface les valeurs inconnues', () => {
    const rows = normalizeRows([
      { type: 'x', points: ['a', 'b', 'c', 'd'] },
      { type: 'sign', points: ['0', 'x', '||', ''], intervals: ['−', '+', '?'] },
      { type: 'variation', points: ['1', ['2', '3'], '4', ['5', '6']], intervals: ['↗', '\\searrow', 'const'] },
    ])
    expect(rows[1].points).toEqual(['0', '', '||', ''])
    expect(rows[1].intervals).toEqual(['-', '+', ''])
    expect(rows[2].intervals).toEqual(['up', 'down', 'const'])
    expect(rows[2].points).toEqual(['1', ['2', '3'], '4', '5']) // pas de double barre sur une borne
  })

  it('complète jusqu’à minPoints avant la borne de droite', () => {
    const rows = normalizeRows(
      [
        { type: 'x', points: ['-\\infty', '+\\infty'], locked: ['p0', 'p1'] },
        { type: 'variation', points: ['a', 'b'], intervals: ['up'] },
      ],
      4
    )
    expect(rows[0].points).toEqual(['-\\infty', '', '', '+\\infty'])
    expect(rows[0].locked).toEqual(['p0', 'p3'])
    expect(rows[1].points).toEqual(['a', '', '', 'b'])
    expect(rows[1].intervals).toEqual(['up', '', ''])
  })

  it('reconnaît un tableau déjà normalisé', () => {
    const raw = [
      { type: 'x', points: ['-\\infty', '-1', '1', '+\\infty'], locked: true },
      { type: 'sign', label: "f'(x)" },
      { type: 'variation', label: 'f(x)' },
    ]
    expect(isNormalized(raw)).toBe(false)
    expect(isNormalized(normalizeRows(raw))).toBe(true)
    expect(isNormalized(normalizeRows(raw), 5)).toBe(false)
  })

  it('garde les verrous valides', () => {
    const rows = normalizeRows([{ type: 'x', points: ['a', 'b'], locked: ['p0', 'q1', 'i0'] }])
    expect(rows[0].locked).toEqual(['p0', 'i0'])
    expect(isLocked(rows[0], 'p', 0)).toBe(true)
    expect(isLocked(rows[0], 'p', 1)).toBe(false)
  })
})

describe('cycles des cases', () => {
  it('signe : vide, +, -, vide', () => {
    expect(['', '+', '-'].map(nextSign)).toEqual(['+', '-', ''])
  })
  it('marque : vide, 0, ||, vide (ou sans valeur interdite)', () => {
    expect(['', '0', '||'].map((v) => nextMark(v))).toEqual(['0', '||', ''])
    expect(['', '0'].map((v) => nextMark(v, false))).toEqual(['0', ''])
  })
  it('flèche : vide, montante, descendante, constante, vide', () => {
    expect(['', 'up', 'down', 'const'].map(nextArrow)).toEqual(['up', 'down', 'const', ''])
  })
})

describe('valeurs interdites', () => {
  it('coupe puis recolle une case de variations', () => {
    const rows = cubic()
    toggleSplit(rows[2], 1)
    expect(rows[2].points[1]).toEqual(['2', ''])
    setPointText(rows[2], 1, 1, '+\\infty')
    expect(rows[2].points[1]).toEqual(['2', '+\\infty'])
    toggleSplit(rows[2], 1)
    expect(rows[2].points[1]).toBe('2')
  })
})

describe('valeur interdite sur une colonne', () => {
  it('double barre dans les variations et || dans les signes, puis retour', () => {
    const rows = cubic()
    rows[1].points[1] = ''
    expect(canToggleColumn(rows, 0)).toBe(false)
    expect(canToggleColumn(rows, 1)).toBe(true)
    toggleColumnSplit(rows, 1)
    expect(isColumnSplit(rows, 1)).toBe(true)
    expect(rows[2].points[1]).toEqual(['2', ''])
    expect(rows[1].points[1]).toBe('||')
    toggleColumnSplit(rows, 1)
    expect(isColumnSplit(rows, 1)).toBe(false)
    expect(rows[2].points[1]).toBe('2')
    expect(rows[1].points[1]).toBe('')
  })

  it('garde un 0 déjà placé dans une ligne de signes', () => {
    const rows = cubic()
    toggleColumnSplit(rows, 1)
    expect(rows[1].points[1]).toBe('0')
    expect(rows[2].points[1]).toEqual(['2', ''])
  })

  it('ne touche pas aux cases figées', () => {
    const rows = cubic()
    rows[1].locked = ['p1']
    toggleColumnSplit(rows, 1)
    expect(rows[1].points[1]).toBe('0')
    rows[2].locked = true
    expect(canToggleColumn(rows, 2)).toBe(false)
  })
})

describe('placement des valeurs et des flèches', () => {
  it('maximum en haut, minimum en bas, bornes selon la flèche', () => {
    const v = cubic()[2]
    expect([0, 1, 2, 3].map((i) => pointLevel(v, i))).toEqual([2, 0, 2, 0])
  })

  it('valeur au milieu quand la fonction reste monotone', () => {
    const v = normalizeRows([
      { type: 'x', points: ['a', 'b', 'c'] },
      { type: 'variation', points: ['', '', ''], intervals: ['up', 'up'] },
    ])[1]
    expect([0, 1, 2].map((i) => pointLevel(v, i))).toEqual([2, 1, 0])
    expect(arrowGeometry(v, 0)).toEqual({ x1: '10%', y1: '83%', x2: '90%', y2: '50%' })
  })

  it('valeur interdite : chaque côté suit sa flèche', () => {
    const v = normalizeRows([
      { type: 'x', points: ['a', 'b', 'c'] },
      { type: 'variation', points: ['', ['', ''], ''], intervals: ['down', 'down'] },
    ])[1]
    expect(pointLevel(v, 1, 0)).toBe(2)
    expect(pointLevel(v, 1, 1)).toBe(0)
    expect(arrowGeometry(v, 1)).toEqual({ x1: '10%', y1: '17%', x2: '90%', y2: '83%' })
  })

  it('pas de flèche tant que le sens n’est pas choisi ; flèche constante horizontale', () => {
    const v = normalizeRows([
      { type: 'x', points: ['a', 'b'] },
      { type: 'variation', points: ['', ''], intervals: [''] },
    ])[1]
    expect(arrowGeometry(v, 0)).toBeNull()
    v.intervals[0] = 'const'
    expect(arrowGeometry(v, 0)).toEqual({ x1: '10%', y1: '50%', x2: '90%', y2: '50%' })
  })
})

describe('ajout et suppression de colonnes', () => {
  it('ajoute une valeur : l’intervalle coupé garde son signe, les verrous suivent', () => {
    const rows = cubic()
    expect(canInsert(rows, 0, 8)).toBe(true)
    insertPoint(rows, 0)
    expect(rows[0].points).toEqual(['-\\infty', '', '-1', '1', '+\\infty'])
    expect(rows[1].intervals).toEqual(['+', '+', '-', '+'])
    expect(rows[2].intervals).toEqual(['up', 'up', 'down', 'up'])
    expect(rows[0].locked).toEqual(['p0', 'p4'])
  })

  it('supprime une valeur intérieure, jamais une borne', () => {
    const rows = cubic()
    expect(canRemove(rows, 0, 2)).toBe(false)
    expect(canRemove(rows, 3, 2)).toBe(false)
    expect(canRemove(rows, 1, 2)).toBe(true)
    removePoint(rows, 1)
    expect(rows[0].points).toEqual(['-\\infty', '1', '+\\infty'])
    expect(rows[1].intervals).toEqual(['+', '+'])
    expect(rows[0].locked).toEqual(['p0', 'p2'])
  })

  it('respecte le nombre minimal et maximal de valeurs et les cases figées', () => {
    const rows = cubic()
    expect(canInsert(rows, 0, 4)).toBe(false)
    expect(canRemove(rows, 1, 4)).toBe(false)
    rows[1].locked = ['i1']
    expect(canInsert(rows, 1, 8)).toBe(false)
    expect(canRemove(rows, 1, 2)).toBe(false)
    expect(canRemove(rows, 2, 2)).toBe(false)
  })
})

describe('cases vides', () => {
  it('compte les cases à remplir, sans les cases figées', () => {
    const rows = normalizeRows([
      { type: 'x', points: ['-\\infty', '', '+\\infty'], locked: ['p0', 'p2'] },
      { type: 'sign', points: ['', '', ''], intervals: ['+', ''] },
      { type: 'variation', points: ['', ['1', ''], ''], intervals: ['', 'down'] },
    ])
    // x : 1 ; signe : 1 intervalle ; variations : 3 valeurs (dont la droite de la double barre) + 1 flèche
    expect(emptyCells(rows)).toBe(6)
    expect(emptyCells(rows, false)).toBe(3)
  })
})
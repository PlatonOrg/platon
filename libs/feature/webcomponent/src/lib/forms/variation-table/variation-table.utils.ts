/**
 * Logique du composant wc-variation-table, indépendante d'Angular (testable seule).
 *
 * Un tableau compte n « points » (les valeurs de x, bornes comprises) et n - 1 « intervalles ».
 * Chaque ligne a donc `points` (n cases) et `intervals` (n - 1 cases) :
 *
 * | type        | points                                              | intervals                       |
 * |-------------|-----------------------------------------------------|---------------------------------|
 * | `x`         | valeurs de x (LaTeX)                                | inutilisés                      |
 * | `sign`      | `''`, `'0'` ou `'\|\|'` (valeur interdite)          | `''`, `'+'` ou `'-'`            |
 * | `variation` | valeur (LaTeX) ou `[gauche, droite]` (double barre) | `''`, `'up'`, `'down'`, `'const'` |
 */

export type TableauRowType = 'x' | 'sign' | 'variation'

/** Case « point » : une valeur, ou deux valeurs de part et d'autre d'une double barre (ligne de variations). */
export type TableauPoint = string | string[]

export interface TableauRow {
  /** Nature de la ligne. La première ligne est toujours la ligne `x`. */
  type: TableauRowType
  /** Intitulé de la ligne, en LaTeX : `x`, `f'(x)`, `f(x)`... */
  label: string
  /** Une case par valeur de x. */
  points: TableauPoint[]
  /** Une case par intervalle entre deux valeurs de x consécutives. */
  intervals: string[]
  /** `true` : ligne figée ; liste d'identifiants (`p0`, `i1`...) : cases figées. */
  locked?: boolean | string[]
}

/** Niveau d'une valeur dans une ligne de variations : 0 en haut, 1 au milieu, 2 en bas. */
export type TableauLevel = 0 | 1 | 2

export interface TableauArrow {
  x1: string
  y1: string
  x2: string
  y2: string
}

export const SIGNS = ['', '+', '-']
export const MARKS = ['', '0', '||']
export const ARROWS = ['', 'up', 'down', 'const']

const SIGN_ALIASES: Record<string, string> = { '−': '-', '–': '-', plus: '+', moins: '-' }
const ARROW_ALIASES: Record<string, string> = {
  '↗': 'up',
  '↘': 'down',
  '→': 'const',
  nearrow: 'up',
  searrow: 'down',
  rightarrow: 'const',
  '\\nearrow': 'up',
  '\\searrow': 'down',
  '\\rightarrow': 'const',
  '+': 'up',
  '-': 'down',
}
const LEVEL_Y = ['17%', '50%', '83%']

const str = (v: unknown): string => (v == null ? '' : String(v))

function pick(value: unknown, allowed: string[], aliases: Record<string, string> = {}): string {
  const v = str(value).trim()
  const w = aliases[v] ?? v
  return allowed.includes(w) ? w : ''
}

function fit<T>(list: T[] | undefined, length: number, filler: () => T): T[] {
  const out = Array.isArray(list) ? list.slice(0, length) : []
  while (out.length < length) out.push(filler())
  return out
}

/** Une case « point » d'une ligne de variations est-elle coupée par une double barre ? */
export function isSplit(point: TableauPoint | undefined): point is string[] {
  return Array.isArray(point)
}

/** Texte (LaTeX) d'une case, ou de l'un de ses deux côtés (0 : gauche, 1 : droite). */
export function pointText(point: TableauPoint | undefined, side = 0): string {
  return Array.isArray(point) ? str(point[side]) : side === 0 ? str(point) : ''
}

function normalizeLocked(locked: unknown): boolean | string[] {
  if (locked === true) return true
  if (!Array.isArray(locked)) return false
  return locked.map(str).filter((id) => /^[pi]\d+$/.test(id))
}

/**
 * Met un tableau au bon format : première ligne `x`, au moins deux valeurs de x, autant de cases
 * dans chaque ligne, valeurs inconnues remplacées par une case vide.
 */
export function normalizeRows(rows: unknown, minPoints = 2): TableauRow[] {
  const input = (Array.isArray(rows) ? rows : []).filter((r) => r && typeof r === 'object') as Partial<TableauRow>[]
  if (!input.length || input[0].type !== 'x') {
    input.unshift({ type: 'x', label: 'x', points: [] })
  }
  const k0 = Math.max(2, Array.isArray(input[0].points) ? input[0].points.length : 0)
  const n = Math.max(k0, minPoints)
  return input.map((row, k) => {
    const type: TableauRowType = k === 0 ? 'x' : row.type === 'variation' ? 'variation' : 'sign'
    // valeurs manquantes (minPoints) : ajoutées avant la dernière valeur, qui reste la borne de droite
    const given = fit(row.points as TableauPoint[], k0, () => '' as TableauPoint)
    given.splice(k0 - 1, 0, ...Array.from({ length: n - k0 }, () => '' as TableauPoint))
    const points = given.map((p, i) => {
      if (type === 'sign') return pick(p, MARKS)
      if (type === 'variation' && Array.isArray(p) && i > 0 && i < n - 1) return [str(p[0]), str(p[1])]
      return Array.isArray(p) ? str(p[0]) : str(p)
    })
    const intervals = fit(row.intervals, k0 - 1, () => '').concat(Array.from({ length: n - k0 }, () => '')).map((v) =>
      type === 'sign' ? pick(v, SIGNS, SIGN_ALIASES) : type === 'variation' ? pick(v, ARROWS, ARROW_ALIASES) : ''
    )
    return {
      type,
      label: str(row.label) || (type === 'x' ? 'x' : ''),
      points,
      intervals,
      locked: shiftedLocks(normalizeLocked(row.locked), k0 - 1, n - k0),
    }
  })
}

function shiftedLocks(locked: boolean | string[], from: number, delta: number): boolean | string[] {
  if (!Array.isArray(locked) || !delta) return locked
  return locked.map((id) => (id[0] === 'p' && Number(id.slice(1)) >= from ? 'p' + (Number(id.slice(1)) + delta) : id))
}

/** Le tableau est-il déjà au format de normalizeRows (sinon, l'afficher tel quel ferait échouer le rendu) ? */
export function isNormalized(rows: unknown, minPoints = 2): rows is TableauRow[] {
  if (!Array.isArray(rows) || !rows.length || rows[0]?.type !== 'x') return false
  const n = Array.isArray(rows[0].points) ? rows[0].points.length : 0
  return (
    n >= Math.max(2, minPoints) &&
    rows.every(
      (row) =>
        row &&
        typeof row.label === 'string' &&
        Array.isArray(row.points) &&
        row.points.length === n &&
        Array.isArray(row.intervals) &&
        row.intervals.length === n - 1
    )
  )
}

/** La case `kind` (`'p'` : point, `'i'` : intervalle) d'indice `index` est-elle figée ? */
export function isLocked(row: TableauRow, kind: 'p' | 'i', index: number): boolean {
  return row.locked === true || (Array.isArray(row.locked) && row.locked.includes(kind + index))
}

export function nextSign(value: string): string {
  return SIGNS[(SIGNS.indexOf(value) + 1) % SIGNS.length]
}

export function nextMark(value: string, forbidden = true): string {
  const cycle = forbidden ? MARKS : ['', '0']
  return cycle[(cycle.indexOf(value) + 1) % cycle.length] ?? ''
}

export function nextArrow(value: string): string {
  return ARROWS[(ARROWS.indexOf(value) + 1) % ARROWS.length]
}

/** La valeur de x d'indice `index` est-elle marquée comme interdite (double barre dans les lignes de variations) ? */
export function isColumnSplit(rows: TableauRow[], index: number): boolean {
  const variations = rows.filter((row) => row.type === 'variation')
  return variations.length > 0 && variations.every((row) => isSplit(row.points[index]))
}

/** Peut-on marquer (ou démarquer) la valeur de x d'indice `index` comme interdite ? Jamais une borne. */
export function canToggleColumn(rows: TableauRow[], index: number): boolean {
  const n = rows[0]?.points.length ?? 0
  return index > 0 && index < n - 1 && rows.some((row) => row.type === 'variation' && !isLocked(row, 'p', index))
}

/**
 * Marque (ou démarque) la valeur de x d'indice `index` comme interdite : double barre dans les
 * lignes de variations et `||` dans les lignes de signes (cases non figées seulement).
 */
export function toggleColumnSplit(rows: TableauRow[], index: number): void {
  const split = !isColumnSplit(rows, index)
  rows.forEach((row) => {
    if (isLocked(row, 'p', index)) return
    if (row.type === 'variation' && isSplit(row.points[index]) !== split) toggleSplit(row, index)
    if (row.type === 'sign') {
      // une marque déjà choisie (0 d'un facteur, par exemple) est conservée
      if (split && row.points[index] === '') row.points[index] = '||'
      else if (!split && row.points[index] === '||') row.points[index] = ''
    }
  })
}

/** Coupe (ou recolle) la case `index` d'une ligne de variations par une double barre. */
export function toggleSplit(row: TableauRow, index: number): void {
  const p = row.points[index]
  row.points[index] = isSplit(p) ? str(p[0]) : [str(p), '']
}

/** Écrit la valeur `text` dans la case `index` (côté `side` si elle est coupée). */
export function setPointText(row: TableauRow, index: number, side: number, text: string): void {
  const p = row.points[index]
  if (isSplit(p)) {
    const copy = [str(p[0]), str(p[1])]
    copy[side] = text
    row.points[index] = copy
  } else {
    row.points[index] = text
  }
}

function shiftLocks(row: TableauRow, from: number, delta: number, drop?: string[]): void {
  if (!Array.isArray(row.locked)) return
  row.locked = row.locked
    .filter((id) => !drop?.includes(id))
    .map((id) => {
      const kind = id[0]
      const k = Number(id.slice(1))
      return k > from ? kind + (k + delta) : id
    })
}

/** Peut-on ajouter une valeur de x entre les points `index` et `index + 1` ? */
export function canInsert(rows: TableauRow[], index: number, maxPoints: number): boolean {
  const n = rows[0]?.points.length ?? 0
  return index >= 0 && index < n - 1 && n < maxPoints && rows.every((row) => !isLocked(row, 'i', index) || row.type === 'x')
}

/**
 * Ajoute une valeur de x entre les points `index` et `index + 1`. L'intervalle coupé garde son
 * signe (ou sa flèche) de part et d'autre de la nouvelle valeur.
 */
export function insertPoint(rows: TableauRow[], index: number): void {
  rows.forEach((row) => {
    row.points.splice(index + 1, 0, '')
    row.intervals.splice(index + 1, 0, row.type === 'x' ? '' : row.intervals[index] ?? '')
    shiftLocks(row, index, 1)
  })
}

/** Peut-on supprimer la valeur de x d'indice `index` (jamais une borne) ? */
export function canRemove(rows: TableauRow[], index: number, minPoints: number): boolean {
  const n = rows[0]?.points.length ?? 0
  return (
    index > 0 &&
    index < n - 1 &&
    n > Math.max(2, minPoints) &&
    rows.every((row) => !isLocked(row, 'p', index) && !isLocked(row, 'i', index - 1) && !isLocked(row, 'i', index))
  )
}

/** Supprime la valeur de x d'indice `index` : les deux intervalles voisins fusionnent (celui de gauche reste). */
export function removePoint(rows: TableauRow[], index: number): void {
  rows.forEach((row) => {
    row.points.splice(index, 1)
    row.intervals.splice(index, 1)
    shiftLocks(row, index, -1, ['p' + index, 'i' + index])
  })
}

function levelFromArrows(left: string | undefined, right: string | undefined): TableauLevel {
  const up = (a?: string) => a === 'up'
  const down = (a?: string) => a === 'down'
  if (up(left) && down(right)) return 0
  if (down(left) && up(right)) return 2
  if ((up(left) && up(right)) || (down(left) && down(right))) return 1
  if (up(left) || down(right)) return 0
  if (down(left) || up(right)) return 2
  return 1
}

/**
 * Niveau (0 : haut, 1 : milieu, 2 : bas) de la valeur du point `index` d'une ligne de variations,
 * déduit des flèches voisines. Pour une case coupée, `side` choisit la valeur de gauche (0) ou de droite (1).
 */
export function pointLevel(row: TableauRow, index: number, side = 0): TableauLevel {
  const left = index > 0 ? row.intervals[index - 1] : undefined
  const right = index < row.points.length - 1 ? row.intervals[index] : undefined
  if (isSplit(row.points[index])) {
    return side === 0 ? levelFromArrows(left, undefined) : levelFromArrows(undefined, right)
  }
  return levelFromArrows(left, right)
}

/**
 * Segment de la flèche de l'intervalle `index` (coordonnées en % de la case), ou `null` si la flèche
 * n'est pas encore choisie. La flèche relie la valeur de gauche à celle de droite.
 */
export function arrowGeometry(row: TableauRow, index: number): TableauArrow | null {
  const arrow = row.intervals[index]
  if (!arrow) return null
  let y1: number = pointLevel(row, index, 1)
  let y2: number = pointLevel(row, index + 1, 0)
  if (arrow === 'up' && y1 <= y2) [y1, y2] = [2, 0]
  if (arrow === 'down' && y1 >= y2) [y1, y2] = [0, 2]
  if (arrow === 'const') y1 = y2 = y1 === y2 ? y1 : 1
  return { x1: '10%', y1: LEVEL_Y[y1], x2: '90%', y2: LEVEL_Y[y2] }
}

/** Nombre de cases que l'élève doit remplir et qui sont encore vides. */
export function emptyCells(rows: TableauRow[], values = true): number {
  let count = 0
  rows.forEach((row) => {
    row.points.forEach((p, i) => {
      if (isLocked(row, 'p', i)) return
      if (row.type === 'x' && !pointText(p).trim()) count++
      if (row.type === 'variation' && values) {
        if (isSplit(p)) count += [0, 1].filter((s) => !pointText(p, s).trim()).length
        else if (!pointText(p).trim()) count++
      }
    })
    if (row.type !== 'x') row.intervals.forEach((v, i) => (!v && !isLocked(row, 'i', i) ? count++ : 0))
  })
  return count
}

/** Libellé lisible (lecteur d'écran) d'une case. */
export function describeCell(row: TableauRow, kind: 'p' | 'i', index: number): string {
  const what = kind === 'p' ? `valeur n° ${index + 1}` : `intervalle n° ${index + 1}`
  if (row.type === 'sign') {
    const v = kind === 'p' ? row.points[index] : row.intervals[index]
    const name = { '': 'vide', '0': 'zéro', '||': 'valeur interdite', '+': 'positif', '-': 'négatif' }[str(v)] ?? 'vide'
    return `${row.label}, ${what} : ${name}. Cliquer pour changer.`
  }
  if (row.type === 'variation' && kind === 'i') {
    const name = { '': 'à choisir', up: 'croissante', down: 'décroissante', const: 'constante' }[row.intervals[index]] ?? ''
    return `${row.label}, ${what} : ${name}. Cliquer pour changer.`
  }
  return `${row.label}, ${what}`
}
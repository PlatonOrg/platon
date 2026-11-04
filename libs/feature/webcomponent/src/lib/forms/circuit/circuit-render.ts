/**
 * Moteur de rendu des schémas électriques de `wc-circuit`.
 *
 * Ce fichier ne dépend d'aucune bibliothèque (ni Angular ni le DOM) :
 * il transforme la description JSON d'un schéma en primitives SVG.
 * Le même fichier sert au composant PLaTon et aux outils de relecture.
 *
 * Règles de connexion (identiques côté Python, `elec.py`) :
 *  - deux broches (ou sommets de fil) au même point de la grille sont reliées ;
 *  - une broche ou un sommet de fil posé à l'intérieur d'un segment de fil est relié à ce fil ;
 *  - deux fils qui se croisent sans sommet commun ne sont pas reliés.
 */

export type Pt = [number, number]

export interface CircuitElement {
  type: string
  id?: string
  label?: string
  value?: number | string
  from?: Pt
  to?: Pt
  at?: Pt
  rot?: number
  flip?: boolean
  points?: Pt[]
  state?: number
  fixed?: boolean
  /* présentation */
  label_side?: string | number
  value_side?: string | number
  value_label?: string
  show_value?: boolean
  label_at?: Pt
  label_pos?: string
  u?: any
  i?: any
  i_at?: string
  lit?: boolean
  dot?: boolean
  text?: string
  size?: number
  anchor?: string
  arrow?: string | boolean
  offset?: number
  side?: string | number
  dir?: string | number
  style?: string
  infinity?: boolean
  /* éléments particuliers */
  inputs?: number
  throws?: number
  off?: boolean
  labels?: (string | number)[]
  w?: number
  h?: number
  pins?: any[]
  signs?: Record<string, string>
  [key: string]: any
}

export interface CircuitSchema {
  unit?: number
  gates?: 'us' | 'iec'
  scale?: number
  elements: CircuitElement[]
  [key: string]: any
}

export interface TextPart {
  t: string
  sub?: boolean
  sup?: boolean
  over?: boolean
}

export type Prim =
  | { k: 'path'; d: string; c: string }
  | { k: 'circle'; x: number; y: number; r: number; c: string }
  | { k: 'rect'; x: number; y: number; w: number; h: number; c: string }
  | {
      k: 'text'
      x: number
      y: number
      parts: TextPart[]
      anchor: 'start' | 'middle' | 'end'
      base: string
      size: number
      c: string
    }

export interface HitBox {
  x: number
  y: number
  w: number
  h: number
}

export interface DrawnElement {
  key: string
  id: string
  type: string
  switchable: boolean
  state: number
  prims: Prim[]
  hit?: HitBox
  aria: string
}

export interface Drawing {
  viewBox: string
  width: number
  height: number
  wires: Prim[]
  elements: DrawnElement[]
  overlay: Prim[]
  errors: string[]
}

export interface SwitchInfo {
  id: string
  type: string
  states: number[]
  initial: number
  fixed: boolean
}

/* ------------------------------------------------------------------------ */
/* Catalogue des types                                                       */
/* ------------------------------------------------------------------------ */

/** Dipôles : placés avec `from` et `to`. */
export const TWO_TERMINALS = [
  'R',
  'L',
  'C',
  'Cpol',
  'Z',
  'Rvar',
  'V',
  'I',
  'Vac',
  'battery',
  'diode',
  'led',
  'zener',
  'lamp',
  'motor',
  'switch',
  'push',
  'fuse',
  'ammeter',
  'voltmeter',
  'Vdep',
  'Idep',
]

/** Éléments placés avec `at` (et éventuellement `rot`, `flip`). */
export const POINT_ELEMENTS = [
  'gnd',
  'rail',
  'node',
  'text',
  'terminal',
  'toggle',
  'probe',
  'clock',
  'selector',
  'npn',
  'pnp',
  'nmos',
  'pmos',
  'opamp',
  'and',
  'or',
  'nand',
  'nor',
  'xor',
  'xnor',
  'not',
  'buf',
  'block',
  'sum',
  'transformer',
  'iarrow',
]

export const OTHER_ELEMENTS = ['wire', 'varrow']

export const SWITCH_TYPES = ['switch', 'push', 'selector', 'toggle']

const GATES = ['and', 'or', 'nand', 'nor', 'xor', 'xnor', 'not', 'buf']

const UNITS: Record<string, string> = {
  R: 'Ω',
  Z: 'Ω',
  Rvar: 'Ω',
  lamp: 'Ω',
  motor: 'Ω',
  L: 'H',
  C: 'F',
  Cpol: 'F',
  V: 'V',
  Vac: 'V',
  battery: 'V',
  rail: 'V',
  I: 'A',
  fuse: 'A',
}

/** Noms français affichés dans les libellés d'accessibilité. */
const NAMES: Record<string, string> = {
  switch: 'Interrupteur',
  push: 'Bouton poussoir',
  selector: 'Commutateur',
  toggle: 'Entrée logique',
}

/* ------------------------------------------------------------------------ */
/* Broches                                                                   */
/* ------------------------------------------------------------------------ */

/*
 * Conversions identiques à elec.py (_to_num, _to_int, _js_round) : le dessin et la simulation
 * doivent lire un schéma JSON de la même façon, même mal écrit.
 */
const NUM_RE = /^\s*[-+]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?\s*$/

/** Nombre fini, ou NaN : nombre, booléen (1/0) ou chaîne numérique ; tout le reste est refusé. */
export function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string' && NUM_RE.test(v)) {
    const n = Number(v)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

/** Entier (au sens de toNum) appartenant à `allowed`, sinon NaN. */
export function toInt(v: unknown, allowed?: number[]): number {
  const n = toNum(v)
  if (!Number.isInteger(n)) return NaN
  return !allowed || allowed.includes(n) ? n : NaN
}

function numOr(v: unknown, fallback: number): number {
  const n = toNum(v ?? fallback)
  return Number.isNaN(n) ? fallback : n
}

function gateInputs(el: CircuitElement): number {
  if (el.type === 'not' || el.type === 'buf') return 1
  const n = toInt(el.inputs ?? 2, [2, 3, 4])
  return Number.isNaN(n) ? 2 : n
}

/** Ordonnées des entrées d'une porte (en unités de grille). */
export function gateInputOffsets(n: number): number[] {
  switch (n) {
    case 1:
      return [0]
    case 2:
      return [-1, 1]
    case 3:
      return [-1, 0, 1]
    default:
      return [-1.5, -0.5, 0.5, 1.5]
  }
}

function selectorThrows(el: CircuitElement): number {
  const n = toInt(el.throws ?? 2, [2, 3, 4, 5, 6])
  return Number.isNaN(n) ? 2 : n
}

/** Broches d'un élément dans son repère local (unités de grille, avant rotation). */
export function localPins(el: CircuitElement): Record<string, Pt> {
  switch (el.type) {
    case 'gnd':
    case 'rail':
    case 'terminal':
    case 'toggle':
    case 'probe':
    case 'clock':
      return { p: [0, 0] }
    case 'selector': {
      const n = selectorThrows(el)
      const pins: Record<string, Pt> = { c: [0, 0] }
      for (let k = 0; k < n; k++) pins['t' + k] = [2, 2 * k - (n - 1)]
      return pins
    }
    case 'npn':
    case 'pnp':
      return { B: [-1, 0], C: [0, -1], E: [0, 1] }
    case 'nmos':
    case 'pmos':
      return { G: [-1, 0], D: [0, -1], S: [0, 1] }
    case 'opamp':
      return { inm: [-2, -1], inp: [-2, 1], out: [2, 0] }
    case 'transformer':
      return { p1: [-1, -1], p2: [-1, 1], s1: [1, -1], s2: [1, 1] }
    case 'sum':
      return { w: [-0.5, 0], e: [0.5, 0], n: [0, -0.5], s: [0, 0.5] }
    case 'block': {
      const pins: Record<string, Pt> = {}
      const w = numOr(el.w, 2)
      if (Array.isArray(el.pins) && el.pins.length) {
        el.pins.forEach((p: any, i: number) => {
          if (p && typeof p === 'object' && isPt(p.at)) pins[String(p.name ?? 'p' + i)] = [p.at[0], p.at[1]]
        })
      } else {
        pins['in'] = [-w / 2, 0]
        pins['out'] = [w / 2, 0]
      }
      return pins
    }
    default:
      if (GATES.includes(el.type)) {
        const pins: Record<string, Pt> = {}
        const names = ['a', 'b', 'c', 'd']
        gateInputOffsets(gateInputs(el)).forEach((y, i) => (pins[names[i]] = [-2, y]))
        pins['out'] = [2, 0]
        return pins
      }
      return {}
  }
}

/** Rotation (degrés, sens horaire à l'écran) et miroir d'un point local. */
export function transformLocal(el: CircuitElement, p: Pt): Pt {
  let x = p[0]
  let y = el.flip ? -p[1] : p[1]
  const r = ((Math.round(numOr(el.rot, 0) / 90) % 4) + 4) % 4
  for (let i = 0; i < r; i++) {
    const nx = -y
    y = x
    x = nx
  }
  const at = el.at ?? [0, 0]
  return [at[0] + x, at[1] + y]
}

/** Broches d'un élément en coordonnées de grille absolues. */
export function elementPins(el: CircuitElement): Record<string, Pt> {
  if (TWO_TERMINALS.includes(el.type)) {
    const pins: Record<string, Pt> = {}
    if (isPt(el.from)) pins['from'] = el.from as Pt
    if (isPt(el.to)) pins['to'] = el.to as Pt
    return pins
  }
  if (POINT_ELEMENTS.includes(el.type) && isPt(el.at)) {
    if (['node', 'text', 'iarrow'].includes(el.type)) return {}
    const local = localPins(el)
    const out: Record<string, Pt> = {}
    Object.keys(local).forEach((k) => (out[k] = transformLocal(el, local[k])))
    return out
  }
  return {}
}

function isPt(p: any): boolean {
  return Array.isArray(p) && p.length === 2 && p.every((c) => typeof c === 'number' && Number.isFinite(c))
}

/* ------------------------------------------------------------------------ */
/* Interrupteurs                                                             */
/* ------------------------------------------------------------------------ */

/** Liste des interrupteurs du schéma avec leurs positions possibles. */
export function switchInfos(schema: CircuitSchema | null | undefined): SwitchInfo[] {
  const infos: SwitchInfo[] = []
  for (const el of elementsOf(schema)) {
    if (!SWITCH_TYPES.includes(el.type) || !el.id) continue
    let states: number[]
    if (el.type === 'selector') {
      states = []
      for (let k = 0; k < selectorThrows(el); k++) states.push(k)
      if (el.off) states.push(-1)
    } else {
      states = [0, 1]
    }
    const st = toInt(el.state, states)
    const initial = Number.isNaN(st) ? states[0] : st
    infos.push({ id: String(el.id), type: el.type, states, initial, fixed: !!el.fixed })
  }
  return infos
}

/**
 * Positions de tous les interrupteurs : la valeur fournie si elle est valide,
 * sinon la position initiale décrite dans le schéma.
 */
export function normalizePositions(
  schema: CircuitSchema | null | undefined,
  value: Record<string, any> | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const info of switchInfos(schema)) {
    const v = value && typeof value === 'object' ? toInt(value[info.id], info.states) : NaN
    out[info.id] = !info.fixed && !Number.isNaN(v) ? v : info.initial
  }
  return out
}

/** Position suivante d'un interrupteur (clic gauche). */
export function nextState(info: SwitchInfo, current: number): number {
  const i = info.states.indexOf(current)
  return info.states[(i + 1) % info.states.length]
}

/* ------------------------------------------------------------------------ */
/* Validation                                                                */
/* ------------------------------------------------------------------------ */

export function elementsOf(schema: any): CircuitElement[] {
  if (!schema) return []
  if (Array.isArray(schema)) return schema.filter((e) => e && typeof e === 'object')
  if (Array.isArray(schema.elements)) return schema.elements.filter((e: any) => e && typeof e === 'object')
  return []
}

/** Attributs numériques mal écrits (mêmes messages que _attr_errors de elec.py). */
function attrErrors(el: CircuitElement): string[] {
  const errs: string[] = []
  if (el.rot != null) {
    const r = toNum(el.rot)
    if (Number.isNaN(r) || r % 90 !== 0) errs.push('« rot » doit valoir 0, 90, 180 ou 270.')
  }
  if (
    GATES.includes(el.type) &&
    el.type !== 'not' &&
    el.type !== 'buf' &&
    el.inputs != null &&
    Number.isNaN(toInt(el.inputs, [2, 3, 4]))
  ) {
    errs.push('« inputs » doit valoir 2, 3 ou 4.')
  }
  if (el.type === 'selector' && el.throws != null && Number.isNaN(toInt(el.throws, [2, 3, 4, 5, 6]))) {
    errs.push('« throws » doit être un entier de 2 à 6.')
  }
  if (el.type === 'block' && el.w != null && Number.isNaN(toNum(el.w))) errs.push('« w » doit être un nombre.')
  if (el.type === 'block' && Array.isArray(el.pins)) {
    el.pins.forEach((pin: any, k: number) => {
      if (!(pin && typeof pin === 'object' && isPt(pin.at))) {
        errs.push(`broche ${k + 1} du bloc : « at » doit être un point [x, y].`)
      }
    })
  }
  return errs
}

export function validateSchema(schema: any): string[] {
  const errors: string[] = []
  if (!schema || (typeof schema !== 'object' && !Array.isArray(schema))) {
    return ['Le schéma doit être un objet JSON {"elements": [...]}.']
  }
  const ids = new Set<string>()
  elementsOf(schema).forEach((el, i) => {
    const where = `élément ${i + 1}${el.id ? ' (' + el.id + ')' : ''}`
    if (![...TWO_TERMINALS, ...POINT_ELEMENTS, ...OTHER_ELEMENTS].includes(el.type)) {
      errors.push(`${where} : type inconnu « ${el.type} ».`)
      return
    }
    if (el.id != null) {
      if (ids.has(String(el.id))) errors.push(`${where} : identifiant « ${el.id} » en double.`)
      ids.add(String(el.id))
    }
    if (TWO_TERMINALS.includes(el.type) || el.type === 'varrow') {
      if (!isPt(el.from) || !isPt(el.to)) errors.push(`${where} : « from » et « to » doivent être des points [x, y].`)
      else if (el.from![0] === el.to![0] && el.from![1] === el.to![1])
        errors.push(`${where} : « from » et « to » sont confondus.`)
    } else if (el.type === 'wire') {
      if (!Array.isArray(el.points) || el.points.length < 2 || !el.points.every(isPt)) {
        errors.push(`${where} : un fil demande « points » (au moins deux points [x, y]).`)
      }
    } else if (!isPt(el.at)) {
      errors.push(`${where} : « at » doit être un point [x, y].`)
    }
    if (SWITCH_TYPES.includes(el.type) && !el.id) {
      errors.push(`${where} : un interrupteur doit avoir un « id ».`)
    }
    attrErrors(el).forEach((e) => errors.push(`${where} : ${e}`))
  })
  // borne posée sur le corps d'un dipôle sans y être reliée : erreur de dessin fréquente
  const els = elementsOf(schema)
  for (const el of els) {
    if (!TWO_TERMINALS.includes(el.type) || !isPt(el.from) || !isPt(el.to)) continue
    for (const other of els) {
      if (other === el) continue
      const pts: Pt[] =
        other.type === 'wire' && Array.isArray(other.points)
          ? other.points.filter(isPt)
          : Object.values(elementPins(other))
      for (const p of pts) {
        if (onSegmentInterior(p, el.from as Pt, el.to as Pt)) {
          errors.push(
            `${el.id ?? el.type} : une borne de « ${
              other.id ?? other.type
            } » est posée sur le dipôle sans y être reliée (point [${p[0]}, ${p[1]}]).`
          )
        }
      }
    }
  }
  return errors
}

/* ------------------------------------------------------------------------ */
/* Jonctions                                                                 */
/* ------------------------------------------------------------------------ */

const EPS = 1e-6

function keyOf(p: Pt): string {
  return `${Math.round(p[0] * 1e6) / 1e6},${Math.round(p[1] * 1e6) / 1e6}`
}

function onSegmentInterior(p: Pt, a: Pt, b: Pt): boolean {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  if (Math.abs(cross) > EPS) return false
  const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])
  const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2
  return dot > EPS && dot < len2 - EPS
}

/**
 * Points où un point de jonction doit être dessiné : au moins trois connexions
 * (extrémités de segments de fil, broches, fil qui traverse le point).
 */
export function junctionPoints(schema: any): Pt[] {
  const els = elementsOf(schema)
  const degree = new Map<string, { p: Pt; d: number }>()
  const add = (p: Pt, d: number) => {
    const k = keyOf(p)
    const cur = degree.get(k)
    if (cur) cur.d += d
    else degree.set(k, { p: [Number(p[0]), Number(p[1])], d })
  }
  const segments: [Pt, Pt][] = []
  for (const el of els) {
    if (el.type === 'wire' && Array.isArray(el.points)) {
      const pts = el.points.filter(isPt)
      for (let i = 0; i + 1 < pts.length; i++) {
        segments.push([pts[i], pts[i + 1]])
        add(pts[i], 1)
        add(pts[i + 1], 1)
      }
    } else {
      const pins = elementPins(el)
      Object.values(pins).forEach((p) => add(p, 1))
    }
  }
  for (const entry of degree.values()) {
    for (const [a, b] of segments) {
      if (onSegmentInterior(entry.p, a, b)) entry.d += 2
    }
  }
  const out: Pt[] = []
  degree.forEach((v) => {
    if (v.d >= 3) out.push(v.p)
  })
  return out
}

/* ------------------------------------------------------------------------ */
/* Texte                                                                     */
/* ------------------------------------------------------------------------ */

const GREEK: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  Gamma: 'Γ',
  delta: 'δ',
  Delta: 'Δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  Theta: 'Θ',
  kappa: 'κ',
  lambda: 'λ',
  Lambda: 'Λ',
  mu: 'µ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  Pi: 'Π',
  rho: 'ρ',
  sigma: 'σ',
  Sigma: 'Σ',
  tau: 'τ',
  phi: 'φ',
  varphi: 'φ',
  Phi: 'Φ',
  chi: 'χ',
  psi: 'ψ',
  Psi: 'Ψ',
  omega: 'ω',
  Omega: 'Ω',
  infty: '∞',
  cdot: '·',
  times: '×',
  approx: '≈',
  leq: '≤',
  geq: '≥',
  circ: '°',
}

/**
 * Découpe un libellé : `R_1`, `V_{CC}`, `x^2`, `\overline{Q}`, `\omega`.
 */
export function parseLabel(text: string): TextPart[] {
  const parts: TextPart[] = []
  let s = String(text ?? '')
  s = s.replace(/\\([A-Za-z]+)(?![{A-Za-z])/g, (m, name) => GREEK[name] ?? m)
  let i = 0
  let buf = ''
  const flush = () => {
    if (buf) parts.push({ t: buf })
    buf = ''
  }
  const group = (): string => {
    if (s[i] === '{') {
      let depth = 1
      let j = i + 1
      while (j < s.length && depth > 0) {
        if (s[j] === '{') depth++
        else if (s[j] === '}') depth--
        j++
      }
      const g = s.slice(i + 1, j - 1)
      i = j
      return g
    }
    const c = s[i] ?? ''
    i++
    return c
  }
  while (i < s.length) {
    const c = s[i]
    if ((c === '_' || c === '^') && i + 1 < s.length) {
      flush()
      i++
      const g = group()
      parts.push(c === '_' ? { t: g, sub: true } : { t: g, sup: true })
    } else if (s.startsWith('\\overline{', i) || s.startsWith('\\bar{', i)) {
      flush()
      i = s.indexOf('{', i)
      parts.push({ t: group(), over: true })
    } else {
      buf += c
      i++
    }
  }
  flush()
  return parts
}

/** Libellé par défaut tiré de l'identifiant : `R1` → `R_1`, `Rb2` → `R_{b2}`. */
export function defaultLabel(id: string): string {
  const m = /^([A-Z])([a-z0-9]+)$/.exec(id)
  if (m) return m[2].length === 1 ? `${m[1]}_${m[2]}` : `${m[1]}_{${m[2]}}`
  return id
}

const PREFIXES: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
  [1e-12, 'p'],
]

/** Formate une valeur avec préfixe SI et virgule décimale : 4700 → « 4,7 kΩ ». */
export function formatValue(v: number, unit: string): string {
  if (!Number.isFinite(v)) return String(v)
  if (v === 0) return `0 ${unit}`.trim()
  const a = Math.abs(v)
  let [f, p] = PREFIXES[PREFIXES.length - 1]
  for (const [factor, prefix] of PREFIXES) {
    if (a >= factor * 0.9999999) {
      f = factor
      p = prefix
      break
    }
  }
  if (unit === '') {
    f = 1
    p = ''
  }
  const x = v / f
  let s = Number(x.toPrecision(3)).toString()
  s = s.replace('.', ',')
  return `${s} ${p}${unit}`.trim()
}

function textWidth(parts: TextPart[], size: number): number {
  return parts.reduce((w, p) => w + p.t.length * size * (p.sub || p.sup ? 0.45 : 0.6), 0)
}

/* ------------------------------------------------------------------------ */
/* Construction des primitives                                               */
/* ------------------------------------------------------------------------ */

type V2 = [number, number]

const r2 = (x: number) => Math.round(x * 100) / 100

class Builder {
  prims: Prim[] = []
  constructor(readonly U: number, readonly fs: number) {}

  line(...pts: V2[]) {
    if (pts.length < 2) return
    this.prims.push({ k: 'path', d: 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L'), c: 'st' })
  }
  path(d: string, c = 'st') {
    this.prims.push({ k: 'path', d, c })
  }
  circle(p: V2, r: number, c = 'bg') {
    this.prims.push({ k: 'circle', x: r2(p[0]), y: r2(p[1]), r: r2(r), c })
  }
  text(
    p: V2,
    label: string | TextPart[],
    anchor: 'start' | 'middle' | 'end' = 'middle',
    base = 'central',
    size?: number,
    c = 'tx'
  ) {
    const parts = typeof label === 'string' ? parseLabel(label) : label
    if (!parts.length) return
    this.prims.push({ k: 'text', x: r2(p[0]), y: r2(p[1]), parts, anchor, base, size: size ?? this.fs, c })
  }
  /** Pointe de flèche pleine en `tip`, dirigée selon `dir` (vecteur unitaire). */
  arrowHead(tip: V2, dir: V2, size?: number, c = 'so') {
    const s = size ?? this.U * 0.2
    const n: V2 = [-dir[1], dir[0]]
    const b: V2 = [tip[0] - dir[0] * s, tip[1] - dir[1] * s]
    const p1: V2 = [b[0] + n[0] * s * 0.4, b[1] + n[1] * s * 0.4]
    const p2: V2 = [b[0] - n[0] * s * 0.4, b[1] - n[1] * s * 0.4]
    this.path(`M${r2(tip[0])} ${r2(tip[1])} L${r2(p1[0])} ${r2(p1[1])} L${r2(p2[0])} ${r2(p2[1])} Z`, c)
  }
}

/** Repère d'un dipôle : centre, direction, normale. */
interface Frame {
  c: V2
  d: V2
  m: V2
  T: (lx: number, ly: number) => V2
}

function frame(a: V2, b: V2): Frame {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const d: V2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  const m: V2 = [-d[1], d[0]]
  const c: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return { c, d, m, T: (lx, ly) => [c[0] + lx * d[0] + ly * m[0], c[1] + lx * d[1] + ly * m[1]] }
}

/** Demi-longueur du corps d'un dipôle (pixels pour U = 40). */
function bodyHalf(type: string): number {
  switch (type) {
    case 'R':
    case 'Z':
    case 'Rvar':
    case 'fuse':
      return 20
    case 'L':
      return 20
    case 'C':
    case 'Cpol':
      return 4
    case 'battery':
      return 4
    case 'diode':
    case 'led':
    case 'zener':
      return 8
    case 'switch':
    case 'push':
      return 14
    case 'lamp':
    case 'ammeter':
    case 'voltmeter':
      return 12
    default:
      return 14
  }
}

function drawTwoTerminal(B: Builder, el: CircuitElement, a: V2, b: V2, state: number) {
  const k = B.U / 40
  const F = frame(a, b)
  const { T } = F
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const h = Math.min(bodyHalf(el.type) * k, len / 2)
  // fils d'amenée
  if (len / 2 > h) {
    B.line(a, T(-h, 0))
    B.line(T(h, 0), b)
  }
  const poly = (pts: V2[], c = 'bg') => B.path('M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L') + ' Z', c)
  switch (el.type) {
    case 'R':
    case 'Z':
    case 'fuse':
    case 'Rvar': {
      const w = 7 * k
      poly([T(-h, -w), T(h, -w), T(h, w), T(-h, w)])
      if (el.type === 'fuse') B.line(T(-h, 0), T(h, 0))
      if (el.type === 'Rvar') {
        const p1 = T(-h * 0.9, w * 2.2)
        const p2 = T(h * 0.9, -w * 2.2)
        B.line(p1, p2)
        const dl = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        B.arrowHead(p2, [(p2[0] - p1[0]) / dl, (p2[1] - p1[1]) / dl], 7 * k)
      }
      break
    }
    case 'L': {
      const n = 4
      const r = h / n
      let d = ''
      for (let i = 0; i < n; i++) {
        const p0 = T(-h + 2 * r * i, 0)
        const p1 = T(-h + 2 * r * (i + 1), 0)
        d += `${i === 0 ? 'M' + r2(p0[0]) + ' ' + r2(p0[1]) : ''} A${r2(r)} ${r2(r)} 0 0 0 ${r2(p1[0])} ${r2(p1[1])} `
      }
      B.path(d.trim())
      break
    }
    case 'C':
    case 'Cpol': {
      const w = 12 * k
      B.line(T(-h, -w), T(-h, w))
      B.line(T(h, -w), T(h, w))
      if (el.type === 'Cpol') B.text(T(-h - 7 * k, -w), '+', 'middle', 'central', B.fs * 0.85)
      break
    }
    case 'battery': {
      B.line(T(h, -12 * k), T(h, 12 * k))
      B.path(`M${r2(T(-h, -6 * k)[0])} ${r2(T(-h, -6 * k)[1])} L${r2(T(-h, 6 * k)[0])} ${r2(T(-h, 6 * k)[1])}`, 'thick')
      B.text(T(h + 6 * k, -12 * k), '+', 'middle', 'central', B.fs * 0.85)
      break
    }
    case 'V':
    case 'I':
    case 'Vac':
    case 'motor':
    case 'ammeter':
    case 'voltmeter':
    case 'lamp': {
      const r = h
      B.circle(F.c, r, el.lit && el.type === 'lamp' ? 'lit' : 'bg')
      if (el.type === 'V') {
        B.line(T(-r, 0), T(r, 0))
        B.text(T(r + 6 * k, 9 * k), '+', 'middle', 'central', B.fs * 0.85)
      } else if (el.type === 'I') {
        B.line(T(-r * 0.6, 0), T(r * 0.35, 0))
        B.arrowHead(T(r * 0.7, 0), F.d, 8 * k)
      } else if (el.type === 'Vac') {
        const q = r * 0.55
        const p0 = T(-q, 0),
          p1 = T(0, 0),
          p2 = T(q, 0)
        const c1 = T(-q / 2, -q * 1.1),
          c2 = T(q / 2, q * 1.1)
        B.path(
          `M${r2(p0[0])} ${r2(p0[1])} Q${r2(c1[0])} ${r2(c1[1])} ${r2(p1[0])} ${r2(p1[1])} Q${r2(c2[0])} ${r2(
            c2[1]
          )} ${r2(p2[0])} ${r2(p2[1])}`
        )
      } else if (el.type === 'lamp') {
        const q = r * 0.7071
        B.line(T(-q, -q), T(q, q))
        B.line(T(-q, q), T(q, -q))
      } else {
        const letter = el.type === 'motor' ? 'M' : el.type === 'ammeter' ? 'A' : 'V'
        B.text(F.c, letter, 'middle', 'central', B.fs)
      }
      break
    }
    case 'Vdep':
    case 'Idep': {
      const r = h
      poly([T(-r, 0), T(0, -r), T(r, 0), T(0, r)])
      if (el.type === 'Vdep') {
        B.text(T(r * 0.45, 0), '+', 'middle', 'central', B.fs * 0.8)
        B.text(T(-r * 0.45, 0), '−', 'middle', 'central', B.fs * 0.8)
      } else {
        B.line(T(-r * 0.55, 0), T(r * 0.25, 0))
        B.arrowHead(T(r * 0.6, 0), F.d, 7 * k)
      }
      break
    }
    case 'diode':
    case 'led':
    case 'zener': {
      const w = 8 * k
      poly([T(-h, -w), T(-h, w), T(h, 0)], el.lit ? 'lit' : 'bg')
      if (el.type === 'zener') {
        B.line(T(h - 3 * k, -w - 3 * k), T(h, -w), T(h, w), T(h + 3 * k, w + 3 * k))
      } else {
        B.line(T(h, -w), T(h, w))
      }
      if (el.type === 'led') {
        for (const off of [-2, 4]) {
          const s = T(off * k, -w - 3 * k)
          const e = T(off * k + 6 * k, -w - 10 * k)
          B.line(s, e)
          const dl = Math.hypot(e[0] - s[0], e[1] - s[1])
          B.arrowHead(e, [(e[0] - s[0]) / dl, (e[1] - s[1]) / dl], 5 * k)
        }
      }
      break
    }
    case 'switch':
    case 'push': {
      const pivot = T(-h, 0)
      const contact = T(h, 0)
      B.circle(pivot, 2.2 * k, 'so')
      B.circle(contact, 2.2 * k, 'so')
      if (el.type === 'switch') {
        const end = state === 1 ? contact : T(-h + 2 * h * Math.cos(0.5), -2 * h * Math.sin(0.5))
        B.path(`M${r2(pivot[0])} ${r2(pivot[1])} L${r2(end[0])} ${r2(end[1])}`, 'blade')
      } else {
        const y = state === 1 ? -2 * k : -9 * k
        const p1 = T(-h - 2 * k, y)
        const p2 = T(h + 2 * k, y)
        B.path(`M${r2(p1[0])} ${r2(p1[1])} L${r2(p2[0])} ${r2(p2[1])}`, 'blade')
        B.line(T(0, y), T(0, y - 9 * k))
        B.line(T(-5 * k, y - 9 * k), T(5 * k, y - 9 * k))
      }
      break
    }
  }
}

/** Contexte d'un élément multi-broches : transformation locale (unités) vers pixels. */
function localTransform(el: CircuitElement, U: number) {
  const P = (lx: number, ly: number): V2 => {
    const g = transformLocal(el, [lx, ly])
    return [g[0] * U, g[1] * U]
  }
  return P
}

function drawPointElement(B: Builder, el: CircuitElement, state: number, gates: string) {
  const U = B.U
  const k = U / 40
  const P = localTransform(el, U)
  const L = (...pts: [number, number][]) => B.line(...pts.map((p) => P(p[0], p[1])))
  const poly = (pts: [number, number][], c = 'bg') =>
    B.path(
      'M' +
        pts
          .map((p) => P(p[0], p[1]))
          .map((p) => `${r2(p[0])} ${r2(p[1])}`)
          .join(' L') +
        ' Z',
      c
    )
  // un miroir inverse le sens de parcours des arcs
  const sweep = (s: number) => (el.flip ? 1 - s : s)
  switch (el.type) {
    case 'gnd': {
      L([0, 0], [0, 0.4])
      L([-0.35, 0.4], [0.35, 0.4])
      L([-0.22, 0.52], [0.22, 0.52])
      L([-0.09, 0.64], [0.09, 0.64])
      break
    }
    case 'rail': {
      L([0, 0], [0, -0.45])
      L([-0.3, -0.45], [0.3, -0.45])
      break
    }
    case 'terminal': {
      B.circle(P(0, 0), 3.5 * k, 'bg')
      break
    }
    case 'node': {
      if (el.dot !== false) B.circle(P(0, 0), 3 * k, 'so')
      break
    }
    case 'clock': {
      L([0, 0], [-0.6, 0])
      poly([
        [-1.6, -0.45],
        [-0.6, -0.45],
        [-0.6, 0.45],
        [-1.6, 0.45],
      ])
      L([-1.45, 0.25], [-1.25, 0.25], [-1.25, -0.25], [-1.0, -0.25], [-1.0, 0.25], [-0.75, 0.25])
      break
    }
    case 'toggle': {
      L([0, 0], [-0.6, 0])
      poly(
        [
          [-1.6, -0.45],
          [-0.6, -0.45],
          [-0.6, 0.45],
          [-1.6, 0.45],
        ],
        state === 1 ? 'on' : 'bg'
      )
      B.text(P(-1.1, 0), String(state === 1 ? 1 : 0), 'middle', 'central', B.fs * 1.05, state === 1 ? 'txon' : 'tx')
      break
    }
    case 'probe': {
      L([0, 0], [0.6, 0])
      B.circle(P(0.95, 0), 0.35 * U, el.lit ? 'lit' : 'bg')
      break
    }
    case 'selector': {
      const n = selectorThrows(el)
      const pivot: [number, number] = [0.6, 0]
      L([0, 0], pivot)
      B.circle(P(pivot[0], pivot[1]), 2.2 * k, 'so')
      const ys: number[] = []
      for (let i = 0; i < n; i++) ys.push(2 * i - (n - 1))
      ys.forEach((y) => {
        L([1.4, y], [2, y])
        B.circle(P(1.4, y), 2.2 * k, 'so')
      })
      let end: V2
      if (state >= 0 && state < n) end = P(1.4, ys[state])
      else end = P(1.3, (ys[0] + ys[1]) / 2 - 0.45)
      const pv = P(pivot[0], pivot[1])
      B.path(`M${r2(pv[0])} ${r2(pv[1])} L${r2(end[0])} ${r2(end[1])}`, 'blade')
      const labels = el.labels
      if (Array.isArray(labels)) {
        ys.forEach((y, i) => {
          if (labels[i] != null) B.text(P(1.4, y - 0.42), String(labels[i]), 'middle', 'central', B.fs * 0.8)
        })
      }
      break
    }
    case 'npn':
    case 'pnp': {
      B.circle(P(-0.15, 0), 0.62 * U, 'bg')
      L([-1, 0], [-0.4, 0])
      B.path(`M${P(-0.4, -0.38).map(r2).join(' ')} L${P(-0.4, 0.38).map(r2).join(' ')}`, 'thick')
      L([-0.4, -0.18], [0, -0.5], [0, -1])
      L([-0.4, 0.18], [0, 0.5], [0, 1])
      const e0 = P(-0.4, 0.18)
      const e1 = P(0, 0.5)
      const dl = Math.hypot(e1[0] - e0[0], e1[1] - e0[1])
      const dir: V2 = [(e1[0] - e0[0]) / dl, (e1[1] - e0[1]) / dl]
      if (el.type === 'npn') {
        B.arrowHead([e0[0] + dir[0] * dl * 0.85, e0[1] + dir[1] * dl * 0.85], dir, 8 * k)
      } else {
        B.arrowHead([e0[0] + dir[0] * dl * 0.25, e0[1] + dir[1] * dl * 0.25], [-dir[0], -dir[1]], 8 * k)
      }
      break
    }
    case 'nmos':
    case 'pmos': {
      L([-1, 0], [-0.5, 0])
      L([-0.5, -0.38], [-0.5, 0.38])
      for (const [y0, y1] of [
        [-0.42, -0.18],
        [-0.1, 0.1],
        [0.18, 0.42],
      ]) {
        B.path(`M${P(-0.36, y0).map(r2).join(' ')} L${P(-0.36, y1).map(r2).join(' ')}`, 'thick')
      }
      L([-0.36, -0.3], [0, -0.3], [0, -1])
      L([-0.36, 0.3], [0, 0.3], [0, 1])
      L([-0.36, 0], [0, 0], [0, 0.3])
      const a = P(-0.36, 0)
      const b2 = P(0, 0)
      const dl = Math.hypot(b2[0] - a[0], b2[1] - a[1])
      const dir: V2 = [(b2[0] - a[0]) / dl, (b2[1] - a[1]) / dl]
      if (el.type === 'nmos') B.arrowHead(a, [-dir[0], -dir[1]], 7 * k)
      else B.arrowHead(b2, dir, 7 * k)
      break
    }
    case 'opamp': {
      L([-2, -1], [-1.3, -1])
      L([-2, 1], [-1.3, 1])
      L([1.4, 0], [2, 0])
      poly([
        [-1.3, -1.5],
        [-1.3, 1.5],
        [1.4, 0],
      ])
      B.text(P(-1.0, -1), '−', 'middle', 'central', B.fs * 1.1)
      B.text(P(-1.0, 1), '+', 'middle', 'central', B.fs * 1.1)
      if (el.infinity !== false) B.text(P(-0.2, 0), '∞', 'middle', 'central', B.fs * 0.9)
      break
    }
    case 'transformer': {
      L([-1, -1], [-0.45, -1])
      L([-1, 1], [-0.45, 1])
      L([1, -1], [0.45, -1])
      L([1, 1], [0.45, 1])
      const r = 0.25
      const coil = (x: number, s: number) => {
        let d = ''
        for (let i = 0; i < 4; i++) {
          const p0 = P(x, -1 + 0.5 * i)
          const p1 = P(x, -1 + 0.5 * (i + 1))
          d += `${i === 0 ? 'M' + r2(p0[0]) + ' ' + r2(p0[1]) : ''} A${r2(r * U)} ${r2(r * U)} 0 0 ${sweep(s)} ${r2(
            p1[0]
          )} ${r2(p1[1])} `
        }
        B.path(d.trim())
      }
      coil(-0.45, 1)
      coil(0.45, 0)
      L([-0.08, -1.05], [-0.08, 1.05])
      L([0.08, -1.05], [0.08, 1.05])
      B.circle(P(-0.75, -0.72), 2.5 * k, 'so')
      B.circle(P(0.75, -0.72), 2.5 * k, 'so')
      break
    }
    case 'sum': {
      B.circle(P(0, 0), 0.5 * U, 'bg')
      const r = 0.5 * 0.7071
      L([-r, -r], [r, r])
      L([-r, r], [r, -r])
      const signs = el.signs ?? {}
      const pos: Record<string, [number, number]> = {
        w: [-0.72, -0.38],
        e: [0.72, -0.38],
        n: [0.38, -0.72],
        s: [0.38, 0.72],
      }
      Object.keys(pos).forEach((key) => {
        if (signs[key]) {
          const sgn = signs[key] === '-' ? '−' : String(signs[key])
          B.text(P(pos[key][0], pos[key][1]), sgn, 'middle', 'central', B.fs * 0.95)
        }
      })
      break
    }
    case 'block': {
      const w = numOr(el.w, 2)
      const h = numOr(el.h, 2)
      poly([
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ])
      if (el.text != null) B.text(P(0, 0), String(el.text), 'middle', 'central', B.fs)
      if (Array.isArray(el.pins)) {
        for (const p of el.pins) {
          if (!p || !isPt(p.at)) continue
          const px = Number(p.at[0])
          const py = Number(p.at[1])
          const inward: [number, number] = Math.abs(px) >= w / 2 - 1e-9 ? [px > 0 ? -1 : 1, 0] : [0, py > 0 ? -1 : 1]
          if (p.clock) {
            const a = P(px, py - 0.18)
            const b2 = P(px + inward[0] * 0.25, py + inward[1] * 0.25)
            const c = P(px, py + 0.18)
            B.path(`M${r2(a[0])} ${r2(a[1])} L${r2(b2[0])} ${r2(b2[1])} L${r2(c[0])} ${r2(c[1])}`)
          }
          if (p.label != null || p.name != null) {
            const lab = p.label != null ? String(p.label) : String(p.name)
            const q = P(px + inward[0] * (p.clock ? 0.42 : 0.15), py + inward[1] * 0.25)
            const g = transformLocal(el, [inward[0], inward[1]])
            const at = el.at ?? [0, 0]
            const gx = g[0] - at[0]
            const anchor = Math.abs(gx) < 1e-9 ? 'middle' : gx > 0 ? 'start' : 'end'
            B.text(q, lab, anchor, 'central', B.fs * 0.8)
          }
        }
      }
      break
    }
    default:
      if (GATES.includes(el.type)) drawGate(B, el, P, sweep, gates)
  }
}

function drawGate(
  B: Builder,
  el: CircuitElement,
  P: (lx: number, ly: number) => V2,
  sweep: (s: number) => number,
  style: string
) {
  const U = B.U
  const k = U / 40
  const ins = gateInputOffsets(gateInputs(el))
  const neg = ['nand', 'nor', 'xnor', 'not'].includes(el.type)
  const H = Math.max(1.3, Math.max(...ins.map(Math.abs)) + 0.35)
  const pt = (x: number, y: number) => P(x, y).map(r2).join(' ')
  const iec = (el.style ?? style) === 'iec'
  const single = el.type === 'not' || el.type === 'buf'
  const bodyRight = single ? (iec ? 0.9 : 0.75) : 1.3
  const outX = neg ? bodyRight + 0.3 : bodyRight
  // fils d'entrée et de sortie
  ins.forEach((y) => {
    const xIn =
      !iec && ['or', 'nor', 'xor', 'xnor'].includes(el.type) ? -1.2 + 0.35 * (1 - (y / H) ** 2) : single ? -0.75 : -1.2
    B.line(P(-2, y), P(iec ? -1.2 : xIn, y))
  })
  B.line(P(outX, 0), P(2, 0))
  if (iec) {
    const Hh = single ? 0.9 : H
    B.path(`M${pt(-1.2, -Hh)} L${pt(0.9, -Hh)} L${pt(0.9, Hh)} L${pt(-1.2, Hh)} Z`, 'bg')
    const sym: Record<string, string> = {
      and: '&',
      nand: '&',
      or: '≥1',
      nor: '≥1',
      xor: '=1',
      xnor: '=1',
      not: '1',
      buf: '1',
    }
    B.text(P(-0.15, -Hh + 0.45), sym[el.type], 'middle', 'central', B.fs)
    if (neg) {
      B.line(P(0.9, 0), P(outX, 0))
      B.circle(P(1.05, 0), 0.15 * U, 'bg')
    }
    return
  }
  const R = H * U
  if (el.type === 'and' || el.type === 'nand') {
    B.path(
      `M${pt(-1.2, -H)} L${pt(0, -H)} A${r2(1.3 * U)} ${r2(R)} 0 0 ${sweep(1)} ${pt(0, H)} L${pt(-1.2, H)} Z`,
      'bg'
    )
  } else if (['or', 'nor', 'xor', 'xnor'].includes(el.type)) {
    B.path(
      `M${pt(-1.2, -H)} Q${pt(0.3, -H)} ${pt(1.3, 0)} Q${pt(0.3, H)} ${pt(-1.2, H)} Q${pt(-0.5, 0)} ${pt(-1.2, -H)} Z`,
      'bg'
    )
    if (el.type === 'xor' || el.type === 'xnor') {
      B.path(`M${pt(-1.45, -H)} Q${pt(-0.75, 0)} ${pt(-1.45, H)}`)
    }
  } else {
    B.path(`M${pt(-0.75, -0.8)} L${pt(0.75, 0)} L${pt(-0.75, 0.8)} Z`, 'bg')
  }
  if (neg) B.circle(P(bodyRight + 0.15, 0), 0.15 * U, 'bg')
  void k
}

/* ------------------------------------------------------------------------ */
/* Libellés et annotations                                                   */
/* ------------------------------------------------------------------------ */

function sideNormal(d: V2, side: number): V2 {
  // côté « libellé » : au-dessus pour un dipôle horizontal, à droite pour un dipôle vertical
  const n: V2 = Math.abs(d[0]) >= Math.abs(d[1]) ? [0, -1] : [1, 0]
  return side < 0 ? [-n[0], -n[1]] : n
}

function anchorFor(n: V2): ['start' | 'middle' | 'end', string] {
  if (n[1] < -0.5) return ['middle', 'auto']
  if (n[1] > 0.5) return ['middle', 'hanging']
  return [n[0] > 0 ? 'start' : 'end', 'central']
}

function annotation(raw: any): { label: string; dir: number; side?: number } | null {
  if (raw == null || raw === false) return null
  if (typeof raw === 'string' || typeof raw === 'number') return { label: String(raw), dir: 1 }
  if (typeof raw === 'object') {
    return { label: String(raw.label ?? ''), dir: Number(raw.dir ?? 1) < 0 ? -1 : 1, side: raw.side }
  }
  return null
}

function sideValue(v: any, fallback: number): number {
  if (v === 'left' || v === 'below' || v === -1) return -1
  if (v === 'right' || v === 'above' || v === 1) return 1
  return fallback
}

function drawTwoTerminalLabels(B: Builder, el: CircuitElement, a: V2, b: V2) {
  const U = B.U
  const k = U / 40
  const F = frame(a, b)
  const h = Math.min(bodyHalf(el.type) * k, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)
  const thick = ['V', 'I', 'Vac', 'lamp', 'motor', 'ammeter', 'voltmeter', 'Vdep', 'Idep'].includes(el.type)
    ? h
    : ['switch', 'push'].includes(el.type)
    ? 12 * k
    : ['C', 'Cpol', 'battery'].includes(el.type)
    ? 13 * k
    : 9 * k
  const side = sideValue(el.label_side, 1)
  const nL = sideNormal(F.d, side)
  const nV: V2 = el.value_side != null ? sideNormal(F.d, sideValue(el.value_side, -1)) : [-nL[0], -nL[1]]
  const source = ['V', 'I', 'Vac', 'battery', 'Vdep', 'Idep'].includes(el.type)
  const u = annotation(el.u)
  // une source dont la flèche de tension est nommée n'a pas besoin d'un second libellé
  const label = el.label != null ? String(el.label) : el.id && !(source && u?.label) ? defaultLabel(String(el.id)) : ''
  const valueText =
    el.value_label != null
      ? String(el.value_label)
      : el.value != null && el.show_value !== false
      ? typeof el.value === 'number'
        ? formatValue(el.value, UNITS[el.type] ?? '')
        : String(el.value)
      : ''
  const gap = thick + 5 * k
  const uSide: V2 = u?.side != null ? sideNormal(F.d, sideValue(u.side, -1)) : nV
  const off = thick + 9 * k
  // annotation de tension : flèche parallèle au dipôle
  if (u) {
    const half = Math.max(h + 6 * k, 16 * k)
    // convention : sources (générateur) → flèche vers « to » ; récepteurs → flèche vers « from »
    const towardTo = (source ? 1 : -1) * u.dir > 0
    const p0: V2 = [F.c[0] - F.d[0] * half + uSide[0] * off, F.c[1] - F.d[1] * half + uSide[1] * off]
    const p1: V2 = [F.c[0] + F.d[0] * half + uSide[0] * off, F.c[1] + F.d[1] * half + uSide[1] * off]
    const [s, e] = towardTo ? [p0, p1] : [p1, p0]
    B.line(s, e)
    const dl = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1
    B.arrowHead(e, [(e[0] - s[0]) / dl, (e[1] - s[1]) / dl], 7 * k)
  }
  // textes rangés côté par côté, du plus proche au plus éloigné du dipôle :
  // nom de la tension (à côté de sa flèche), puis libellé et valeur
  const sides: { n: V2; start: number; first: string[]; rest: string[] }[] = []
  const sideOf = (n: V2) => {
    let entry = sides.find((x) => x.n[0] === n[0] && x.n[1] === n[1])
    if (!entry) {
      entry = { n, start: gap, first: [], rest: [] }
      sides.push(entry)
    }
    return entry
  }
  if (u) {
    const e = sideOf(uSide)
    e.start = off + 5 * k
    if (u.label) e.first.push(u.label)
  }
  if (label) sideOf(nL).rest.push(label)
  if (valueText) sideOf(nV).rest.push(valueText)
  const lineH = B.fs * 1.2
  for (const e of sides) {
    const [an, base] = anchorFor(e.n)
    const horizontalNormal = Math.abs(e.n[0]) > 0.5
    let cursor = e.start
    if (horizontalNormal) {
      // dipôle vertical : le nom de la tension en colonne, puis libellé et valeur empilés
      for (const t of e.first) {
        B.text([F.c[0] + e.n[0] * cursor, F.c[1]], t, an, base)
        cursor += textWidth(parseLabel(t), B.fs) + 6 * k
      }
      const n = e.rest.length
      e.rest.forEach((t, j) => {
        const dy = (j - (n - 1) / 2) * lineH
        B.text([F.c[0] + e.n[0] * cursor, F.c[1] + dy], t, an, base)
      })
    } else {
      // dipôle horizontal : lignes successives au-dessus ou au-dessous
      for (const t of [...e.first, ...e.rest]) {
        B.text([F.c[0], F.c[1] + e.n[1] * cursor], t, an, base)
        cursor += lineH
      }
    }
  }
  // annotation de courant : pointe de flèche sur le fil d'amenée
  const i = annotation(el.i)
  if (i) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const leadLen = len / 2 - h
    const useEnd = el.i_at === 'to'
    const dir: V2 = i.dir > 0 ? F.d : [-F.d[0], -F.d[1]]
    let tipT: number
    if (leadLen >= 12 * k) {
      const center = useEnd ? len / 2 - leadLen / 2 : -len / 2 + leadLen / 2
      tipT = center + (i.dir > 0 ? 4 * k : -4 * k)
    } else {
      tipT = (useEnd ? len / 2 : -len / 2) + (useEnd ? -2 : 2) * k
    }
    const tip: V2 = [F.c[0] + F.d[0] * tipT, F.c[1] + F.d[1] * tipT]
    B.arrowHead(tip, dir, 8 * k)
    if (i.label) {
      const ni = sideNormal(F.d, sideValue(i.side, 1))
      const [an, base] = anchorFor(ni)
      B.text([tip[0] + ni[0] * 8 * k, tip[1] + ni[1] * 8 * k], i.label, an, base, B.fs * 0.95)
    }
  }
}

/** Boîte englobante (pixels) d'un ensemble de primitives. */
function bbox(prims: Prim[]): HitBox | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  const add = (x: number, y: number) => {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  for (const p of prims) {
    if (p.k === 'circle') {
      add(p.x - p.r, p.y - p.r)
      add(p.x + p.r, p.y + p.r)
    } else if (p.k === 'rect') {
      add(p.x, p.y)
      add(p.x + p.w, p.y + p.h)
    } else if (p.k === 'text') {
      const w = textWidth(p.parts, p.size)
      const xs = p.anchor === 'start' ? p.x : p.anchor === 'end' ? p.x - w : p.x - w / 2
      const ys = p.base === 'auto' ? p.y - p.size : p.base === 'hanging' ? p.y : p.y - p.size / 2
      add(xs, ys)
      add(xs + w, ys + p.size * 1.15)
    } else {
      const nums = p.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
      // les arcs « A rx ry rot large sweep x y » : on ne garde que les points
      const cmds = p.d.match(/[MLQAZ][^MLQAZ]*/g) ?? []
      if (cmds.length) {
        for (const c of cmds) {
          const v = c
            .slice(1)
            .trim()
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number)
          if (c[0] === 'A') {
            add(v[5], v[6])
            add(v[5] - v[0], v[6] - v[1])
            add(v[5] + v[0], v[6] + v[1])
          } else {
            for (let i = 0; i + 1 < v.length; i += 2) add(v[i], v[i + 1])
          }
        }
      } else {
        for (let i = 0; i + 1 < nums.length; i += 2) add(nums[i], nums[i + 1])
      }
    }
  }
  if (!Number.isFinite(x0)) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

function multiPinLabel(B: Builder, el: CircuitElement, prims: Prim[]) {
  const label =
    el.label != null
      ? String(el.label)
      : el.id && !['toggle', 'probe', 'clock'].includes(el.type)
      ? defaultLabel(String(el.id))
      : ''
  const U = B.U
  if (['toggle', 'clock'].includes(el.type) || el.type === 'probe' || el.type === 'terminal' || el.type === 'node') {
    const name = el.label != null ? String(el.label) : el.id ? String(el.id) : ''
    if (!name) return
    const P = localTransform(el, U)
    const at = P(0, 0)
    let dirPt: V2
    if (el.type === 'probe') dirPt = P(1.45, 0)
    else if (el.type === 'terminal' || el.type === 'node') {
      const lp = el.label_at
      if (Array.isArray(lp)) {
        B.text([lp[0] * U, lp[1] * U], name, 'middle', 'central')
        return
      }
      const pos = el.label_pos ?? 'above'
      const off: Record<string, [V2, 'start' | 'middle' | 'end', string]> = {
        above: [[0, -8], 'middle', 'auto'],
        below: [[0, 8], 'middle', 'hanging'],
        left: [[-8, 0], 'end', 'central'],
        right: [[8, 0], 'start', 'central'],
        'above-left': [[-5, -6], 'end', 'auto'],
        'above-right': [[5, -6], 'start', 'auto'],
        'below-left': [[-5, 6], 'end', 'hanging'],
        'below-right': [[5, 6], 'start', 'hanging'],
      }
      const o = off[pos] ?? off['above']
      B.text([at[0] + (o[0][0] * U) / 40, at[1] + (o[0][1] * U) / 40], name, o[1], o[2])
      return
    } else dirPt = P(-1.75, 0)
    const dx = dirPt[0] - at[0]
    const dy = dirPt[1] - at[1]
    const anchor = Math.abs(dx) < 1 ? 'middle' : dx > 0 ? 'start' : 'end'
    const base = Math.abs(dy) < 1 ? 'central' : dy > 0 ? 'hanging' : 'auto'
    B.text(dirPt, name, anchor, base)
    return
  }
  if (!label) return
  if (Array.isArray(el.label_at)) {
    B.text([el.label_at[0] * U, el.label_at[1] * U], label, 'middle', 'central')
    return
  }
  const box = bbox(prims)
  if (!box) return
  const pos =
    el.label_pos ??
    (['npn', 'pnp', 'nmos', 'pmos'].includes(el.type) ? 'right' : el.type === 'rail' ? 'above' : 'above')
  const g = (4 * U) / 40
  if (pos === 'right') B.text([box.x + box.w + g, box.y + box.h / 2], label, 'start', 'central')
  else if (pos === 'left') B.text([box.x - g, box.y + box.h / 2], label, 'end', 'central')
  else if (pos === 'below') B.text([box.x + box.w / 2, box.y + box.h + g], label, 'middle', 'hanging')
  else if (pos === 'inside') B.text([box.x + box.w / 2, box.y + box.h / 2], label, 'middle', 'central')
  else B.text([box.x + box.w / 2, box.y - g], label, 'middle', 'auto')
}

/* ------------------------------------------------------------------------ */
/* Rendu complet                                                             */
/* ------------------------------------------------------------------------ */

export interface RenderOptions {
  /** Facteur d'échelle appliqué à la taille d'affichage (1 par défaut). */
  scale?: number
}

export function renderCircuit(
  schema: CircuitSchema | null | undefined,
  positions: Record<string, number> = {},
  options: RenderOptions = {}
): Drawing {
  const errors = validateSchema(schema)
  const U = Math.max(10, Math.min(100, Number((schema as any)?.unit ?? 40) || 40))
  const fs = Math.round(14 * (U / 40) * 10) / 10
  const gates = (schema as any)?.gates === 'iec' ? 'iec' : 'us'
  const wiresB = new Builder(U, fs)
  const overlayB = new Builder(U, fs)
  const elements: DrawnElement[] = []
  const pos = normalizePositions(schema, positions)
  const infos = new Map(switchInfos(schema).map((s) => [s.id, s]))
  const valid = (el: CircuitElement) => {
    if (TWO_TERMINALS.includes(el.type) || el.type === 'varrow') {
      return isPt(el.from) && isPt(el.to) && !(el.from![0] === el.to![0] && el.from![1] === el.to![1])
    }
    if (el.type === 'wire') return Array.isArray(el.points) && el.points.filter(isPt).length >= 2
    return isPt(el.at) && [...POINT_ELEMENTS].includes(el.type)
  }
  elementsOf(schema).forEach((el, index) => {
    if (!valid(el)) return
    const px = (p: Pt): V2 => [Number(p[0]) * U, Number(p[1]) * U]
    if (el.type === 'wire') {
      const pts = el.points!.filter(isPt).map(px)
      wiresB.line(...pts)
      const arrow = el.arrow
      if (arrow === 'end' || arrow === 'both' || arrow === true) {
        const a = pts[pts.length - 2],
          b = pts[pts.length - 1]
        const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        wiresB.arrowHead(b, [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], (9 * U) / 40)
      }
      if (arrow === 'start' || arrow === 'both') {
        const a = pts[1],
          b = pts[0]
        const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        wiresB.arrowHead(b, [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], (9 * U) / 40)
      }
      if (el.label != null) {
        const i = Math.max(0, Math.floor((pts.length - 2) / 2))
        const a = pts[i],
          b = pts[i + 1]
        const m: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1])
        const s = sideValue(el.label_side, 1)
        if (horiz) wiresB.text([m[0], m[1] - (s * 6 * U) / 40], String(el.label), 'middle', s > 0 ? 'auto' : 'hanging')
        else wiresB.text([m[0] + (s * 6 * U) / 40, m[1]], String(el.label), s > 0 ? 'start' : 'end', 'central')
      }
      return
    }
    if (el.type === 'varrow') {
      const a = px(el.from!),
        b = px(el.to!)
      const F = frame(a, b)
      const off = Number(el.offset ?? 0.5) * U
      const n: V2 = [
        F.m[0] * (el.side === 'right' || el.side === -1 ? -1 : 1),
        F.m[1] * (el.side === 'right' || el.side === -1 ? -1 : 1),
      ]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const shrink = Math.min(len * 0.15, (10 * U) / 40)
      const s: V2 = [a[0] + F.d[0] * shrink + n[0] * off, a[1] + F.d[1] * shrink + n[1] * off]
      const e: V2 = [b[0] - F.d[0] * shrink + n[0] * off, b[1] - F.d[1] * shrink + n[1] * off]
      overlayB.line(s, e)
      overlayB.arrowHead(e, F.d, (8 * U) / 40)
      if (el.label != null) {
        const nn: V2 = Math.abs(n[0]) > Math.abs(n[1]) ? [Math.sign(n[0]), 0] : [0, Math.sign(n[1])]
        const [an, base] = anchorFor(nn)
        overlayB.text(
          [(s[0] + e[0]) / 2 + (nn[0] * 6 * U) / 40, (s[1] + e[1]) / 2 + (nn[1] * 6 * U) / 40],
          String(el.label),
          an,
          base
        )
      }
      return
    }
    if (el.type === 'iarrow') {
      const at = px(el.at!)
      const dirs: Record<string, V2> = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }
      const d = dirs[String(el.dir ?? 'right')] ?? [1, 0]
      overlayB.arrowHead([at[0] + (d[0] * 4 * U) / 40, at[1] + (d[1] * 4 * U) / 40], d, (8 * U) / 40)
      if (el.label != null) {
        const n: V2 = d[0] !== 0 ? [0, -1] : [1, 0]
        const s = sideValue(el.label_side, 1)
        const nn: V2 = [n[0] * s, n[1] * s]
        const [an, base] = anchorFor(nn)
        overlayB.text([at[0] + (nn[0] * 8 * U) / 40, at[1] + (nn[1] * 8 * U) / 40], String(el.label), an, base)
      }
      return
    }
    if (el.type === 'text') {
      const at = px(el.at!)
      const anchor = el.anchor === 'start' || el.anchor === 'end' ? el.anchor : 'middle'
      overlayB.text(at, String(el.text ?? el.label ?? ''), anchor, 'central', fs * Number(el.size ?? 1))
      return
    }
    const B = new Builder(U, fs)
    const state = el.id && infos.has(String(el.id)) ? pos[String(el.id)] : numOr(el.state, 0)
    if (TWO_TERMINALS.includes(el.type)) {
      const a = px(el.from!),
        b = px(el.to!)
      drawTwoTerminal(B, el, a, b, state)
      const body = B.prims.slice()
      drawTwoTerminalLabels(B, el, a, b)
      pushElement(el, index, B.prims, body, state)
    } else {
      drawPointElement(B, el, state, gates)
      const body = B.prims.slice()
      if (el.type === 'rail') {
        const P = localTransform(el, U)
        const lab =
          el.label != null
            ? String(el.label)
            : el.value != null
            ? typeof el.value === 'number'
              ? (el.value > 0 ? '+' : '') + formatValue(el.value, 'V')
              : String(el.value)
            : ''
        if (lab) {
          const top = P(0, -0.55)
          const at = P(0, 0)
          const dy = top[1] - at[1]
          const dx = top[0] - at[0]
          B.text(
            top,
            lab,
            Math.abs(dx) < 1 ? 'middle' : dx > 0 ? 'start' : 'end',
            Math.abs(dy) < 1 ? 'central' : dy < 0 ? 'auto' : 'hanging'
          )
        }
      } else if (el.type !== 'gnd') {
        multiPinLabel(B, el, body)
      }
      pushElement(el, index, B.prims, body, state)
    }
  })

  function pushElement(el: CircuitElement, index: number, prims: Prim[], body: Prim[], state: number) {
    const id = el.id != null ? String(el.id) : ''
    const info = id ? infos.get(id) : undefined
    const switchable = !!info && !info.fixed
    let hit: HitBox | undefined
    if (info) {
      const b = bbox(body)
      if (b) {
        const pad = (4 * U) / 40
        hit = { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }
      }
    }
    elements.push({
      key: `${index}-${el.type}-${id}`,
      id,
      type: el.type,
      switchable,
      state,
      prims,
      hit,
      aria: info ? switchAria(el, state) : '',
    })
  }

  // points de jonction
  for (const p of junctionPoints(schema)) {
    overlayB.circle([p[0] * U, p[1] * U], (3 * U) / 40, 'so')
  }

  const all: Prim[] = [...wiresB.prims, ...overlayB.prims]
  elements.forEach((e) => all.push(...e.prims))
  const box = bbox(all) ?? { x: 0, y: 0, w: U, h: U }
  const margin = (8 * U) / 40
  const x = Math.floor(box.x - margin)
  const y = Math.floor(box.y - margin)
  const w = Math.ceil(box.w + 2 * margin)
  const h = Math.ceil(box.h + 2 * margin)
  const scale = Number(options.scale ?? (schema as any)?.scale ?? 1) || 1
  return {
    viewBox: `${x} ${y} ${w} ${h}`,
    width: Math.round(w * scale),
    height: Math.round(h * scale),
    wires: wiresB.prims,
    elements,
    overlay: overlayB.prims,
    errors,
  }
}

/** Libellé d'accessibilité d'un interrupteur dans une position donnée. */
export function switchAria(el: CircuitElement, state: number): string {
  const name = `${NAMES[el.type] ?? 'Interrupteur'} ${el.label ?? el.id}`
  if (el.type === 'switch' || el.type === 'push') return `${name} : ${state === 1 ? 'fermé' : 'ouvert'}`
  if (el.type === 'toggle') return `${name} : ${state === 1 ? '1' : '0'}`
  if (state < 0) return `${name} : aucune position`
  const labels = Array.isArray(el.labels) ? el.labels : null
  return `${name} : position ${labels && labels[state] != null ? labels[state] : state}`
}

/* ------------------------------------------------------------------------ */
/* Export SVG autonome (outils, galerie, tests)                              */
/* ------------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function primToSvg(p: Prim): string {
  switch (p.k) {
    case 'path':
      return `<path class="${p.c}" d="${p.d}"/>`
    case 'circle':
      return `<circle class="${p.c}" cx="${p.x}" cy="${p.y}" r="${p.r}"/>`
    case 'rect':
      return `<rect class="${p.c}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>`
    case 'text': {
      const spans = p.parts
        .map((t) => {
          if (t.sub)
            return `<tspan class="sub" baseline-shift="sub" font-size="${r2(p.size * 0.72)}">${esc(t.t)}</tspan>`
          if (t.sup)
            return `<tspan class="sup" baseline-shift="super" font-size="${r2(p.size * 0.72)}">${esc(t.t)}</tspan>`
          if (t.over) return `<tspan text-decoration="overline">${esc(t.t)}</tspan>`
          return `<tspan>${esc(t.t)}</tspan>`
        })
        .join('')
      return `<text class="${p.c}" x="${p.x}" y="${p.y}" text-anchor="${p.anchor}" dominant-baseline="${p.base}" font-size="${p.size}">${spans}</text>`
    }
  }
}

export const SVG_STYLE = `
.st{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.thick{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round}
.blade{fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.bg{fill:var(--wc-circuit-bg,#fff);stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}
.so{fill:currentColor;stroke:none}
.lit{fill:#ffd54a;stroke:currentColor;stroke-width:1.6}
.on{fill:var(--wc-circuit-accent,#1677ff);stroke:currentColor;stroke-width:1.6}
.tx{fill:currentColor;font-family:inherit}
.txon{fill:#fff;font-weight:700;font-family:inherit}
`

/** SVG autonome (sans interaction) d'un schéma. */
export function circuitToSvg(
  schema: CircuitSchema,
  positions: Record<string, number> = {},
  options: RenderOptions = {}
): string {
  const d = renderCircuit(schema, positions, options)
  const body = [...d.wires, ...d.elements.flatMap((e) => e.prims), ...d.overlay].map(primToSvg).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" width="${d.width}" height="${d.height}" style="color:#1b1b1b;font-family:sans-serif"><style>${SVG_STYLE}</style>${body}</svg>`
}

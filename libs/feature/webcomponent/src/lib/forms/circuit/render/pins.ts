import { GATES, TWO_TERMINALS, POINT_ELEMENTS } from './constants'
import { CircuitElement, Pt } from './types'

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

export function numOr(v: unknown, fallback: number): number {
  const n = toNum(v ?? fallback)
  return Number.isNaN(n) ? fallback : n
}

export function gateInputs(el: CircuitElement): number {
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

export function selectorThrows(el: CircuitElement): number {
  const n = toInt(el.throws ?? 2, [2, 3, 4, 5, 6])
  return Number.isNaN(n) ? 2 : n
}

/** Broches d'un élément dans son repère local (unités de grille, avant rotation). */
function localPins(el: CircuitElement): Record<string, Pt> {
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

export function isPt(p: any): boolean {
  return Array.isArray(p) && p.length === 2 && p.every((c) => typeof c === 'number' && Number.isFinite(c))
}

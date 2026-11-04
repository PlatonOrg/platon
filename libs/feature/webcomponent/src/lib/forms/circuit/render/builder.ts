/* ------------------------------------------------------------------------ */
/* Construction des primitives                                               */
/* ------------------------------------------------------------------------ */

import { GATES } from './constants'
import { transformLocal, selectorThrows, numOr, isPt, gateInputOffsets, gateInputs } from './pins'
import { parseLabel } from './text'
import { Prim, TextPart, CircuitElement, V2, Frame } from './types'

export const r2 = (x: number) => Math.round(x * 100) / 100

export class Builder {
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

export function frame(a: V2, b: V2): Frame {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const d: V2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  const m: V2 = [-d[1], d[0]]
  const c: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return { c, d, m, T: (lx, ly) => [c[0] + lx * d[0] + ly * m[0], c[1] + lx * d[1] + ly * m[1]] }
}

/** Demi-longueur du corps d'un dipôle (pixels pour U = 40). */
export function bodyHalf(type: string): number {
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

export function drawTwoTerminal(B: Builder, el: CircuitElement, a: V2, b: V2, state: number) {
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
export function localTransform(el: CircuitElement, U: number) {
  const P = (lx: number, ly: number): V2 => {
    const g = transformLocal(el, [lx, ly])
    return [g[0] * U, g[1] * U]
  }
  return P
}

export function drawPointElement(B: Builder, el: CircuitElement, state: number, gates: string) {
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

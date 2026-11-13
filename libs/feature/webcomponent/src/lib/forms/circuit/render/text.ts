/* ------------------------------------------------------------------------ */
/* Texte                                                                     */
/* ------------------------------------------------------------------------ */

import { Builder, frame, bodyHalf, localTransform } from './builder'
import { UNITS } from './constants'
import { isPt } from './pins'
import { CircuitElement, HitBox, Prim, TextPart, V2 } from './types'

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
/* Libellés et annotations                                                   */
/* ------------------------------------------------------------------------ */

function sideNormal(d: V2, side: number): V2 {
  // côté « libellé » : au-dessus pour un dipôle horizontal, à droite pour un dipôle vertical
  const n: V2 = Math.abs(d[0]) >= Math.abs(d[1]) ? [0, -1] : [1, 0]
  return side < 0 ? [-n[0], -n[1]] : n
}

export function anchorFor(n: V2): ['start' | 'middle' | 'end', string] {
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

export function sideValue(v: any, fallback: number): number {
  if (v === 'left' || v === 'below' || v === -1) return -1
  if (v === 'right' || v === 'above' || v === 1) return 1
  return fallback
}

export function drawTwoTerminalLabels(B: Builder, el: CircuitElement, a: V2, b: V2) {
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
export function bbox(prims: Prim[]): HitBox | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  const add = (x: number, y: number) => {
    // une coordonnée NaN (attribut mal écrit) ne doit pas faire perdre la boîte de tout le schéma
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
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

export function multiPinLabel(B: Builder, el: CircuitElement, prims: Prim[]) {
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
      if (isPt(lp)) {
        B.text([lp![0] * U, lp![1] * U], name, 'middle', 'central')
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
  if (isPt(el.label_at)) {
    B.text([el.label_at![0] * U, el.label_at![1] * U], label, 'middle', 'central')
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

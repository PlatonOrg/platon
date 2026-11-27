/* ------------------------------------------------------------------------ */
/* Libellés : indices, exposants, barre, lettres grecques                    */
/* ------------------------------------------------------------------------ */

import { TextPart } from './types'

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

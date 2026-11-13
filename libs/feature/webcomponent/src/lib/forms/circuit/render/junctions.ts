/* ------------------------------------------------------------------------ */
/* Jonctions                                                                 */
/* ------------------------------------------------------------------------ */

import { isPt, elementPins } from './pins'
import { Pt } from './types'
import { elementsOf, onSegmentInterior } from './validation'

function keyOf(p: Pt): string {
  return `${Math.round(p[0] * 1e6) / 1e6},${Math.round(p[1] * 1e6) / 1e6}`
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

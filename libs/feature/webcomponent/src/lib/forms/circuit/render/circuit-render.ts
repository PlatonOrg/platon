/**
 * Moteur de rendu des schémas électriques de `wc-circuit`.
 *
 * Ce fichier ne dépend d'aucune bibliothèque (ni Angular ni le DOM) :
 * il transforme la description JSON d'un schéma en primitives SVG.
 * `circuitToSvg` en tire aussi un SVG autonome (tests, export).
 *
 * Règles de connexion (un correcteur qui reconstitue le circuit doit appliquer les mêmes) :
 *  - deux broches (ou sommets de fil) au même point de la grille sont reliées ;
 *  - une broche ou un sommet de fil posé à l'intérieur d'un segment de fil est relié à ce fil ;
 *  - deux fils qui se croisent sans sommet commun ne sont pas reliés.
 */

import { CircuitElement, Pt, CircuitSchema, Prim, HitBox, Drawing, DrawnElement, V2 } from './types'
import { NAMES, POINT_ELEMENTS, TWO_TERMINALS } from './constants'
import { isPt, numOr } from './pins'
import { normalizePositions, switchInfos } from './switches'
import { elementsOf, validateSchema } from './validation'
import { junctionPoints } from './junctions'
import { formatValue, sideValue, anchorFor, drawTwoTerminalLabels, multiPinLabel, bbox } from './text'
import { Builder, drawPointElement, drawTwoTerminal, frame, localTransform, r2 } from './builder'

/* ------------------------------------------------------------------------ */
/* Rendu complet                                                             */
/* ------------------------------------------------------------------------ */

interface RenderOptions {
  /** Facteur d'échelle appliqué à la taille d'affichage (1 par défaut). */
  scale?: number
}

export function renderCircuit(
  schema: CircuitSchema | null | undefined,
  positions: Record<string, number> = {},
  options: RenderOptions = {}
): Drawing {
  const errors = validateSchema(schema)
  const U = Math.max(10, Math.min(100, Number(schema?.unit ?? 40) || 40))
  const fs = Math.round(14 * (U / 40) * 10) / 10
  const gates = schema?.gates === 'iec' ? 'iec' : 'us'
  const wiresB = new Builder(U, fs)
  const overlayB = new Builder(U, fs)
  const elements: DrawnElement[] = []
  const pos = normalizePositions(schema, positions)
  const infos = new Map(switchInfos(schema).map((s) => [s.id, s]))
  const valid = (el: CircuitElement) => {
    if (TWO_TERMINALS.includes(el.type) || el.type === 'varrow') {
      return isPt(el.from) && isPt(el.to) && !(el.from[0] === el.to[0] && el.from[1] === el.to[1])
    }
    if (el.type === 'wire') return Array.isArray(el.points) && el.points.filter(isPt).length >= 2
    return isPt(el.at) && POINT_ELEMENTS.includes(el.type)
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
      const off = numOr(el.offset, 0.5) * U
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
      overlayB.text(at, String(el.text ?? el.label ?? ''), anchor, 'central', fs * numOr(el.size, 1))
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
    // zone cliquable seulement pour un interrupteur manœuvrable ; un interrupteur fixe garde son libellé d'état
    let hit: HitBox | undefined
    if (switchable) {
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
      aria: info ? switchAria(el, state, info.fixed) : '',
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
  const scale = Number(options.scale ?? schema?.scale ?? 1) || 1
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
function switchAria(el: CircuitElement, state: number, fixed = false): string {
  const name = `${NAMES[el.type] ?? 'Interrupteur'}${fixed ? ' fixe' : ''} ${el.label ?? el.id}`
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

function primToSvg(p: Prim): string {
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

const SVG_STYLE = `
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

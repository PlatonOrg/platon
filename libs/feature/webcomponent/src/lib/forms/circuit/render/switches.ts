import { SWITCH_TYPES } from './constants'
import { selectorThrows, toInt } from './pins'
import { CircuitSchema, SwitchInfo } from './types'
import { elementsOf } from './validation'

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

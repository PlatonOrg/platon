import { GATES, TWO_TERMINALS, POINT_ELEMENTS, OTHER_ELEMENTS, SWITCH_TYPES } from './constants'
import { toNum, toInt, isPt, elementPins } from './pins'
import { CircuitElement, Pt } from './types'

/* ------------------------------------------------------------------------ */
/* Validation                                                                */
/* ------------------------------------------------------------------------ */

export function elementsOf(schema: any): CircuitElement[] {
  if (!schema) return []
  if (Array.isArray(schema)) return schema.filter((e) => e && typeof e === 'object')
  if (Array.isArray(schema.elements)) return schema.elements.filter((e: any) => e && typeof e === 'object')
  return []
}

const EPS = 1e-6

export function onSegmentInterior(p: Pt, a: Pt, b: Pt): boolean {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  if (Math.abs(cross) > EPS) return false
  const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])
  const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2
  return dot > EPS && dot < len2 - EPS
}

/** Attributs numériques mal écrits. */
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
  if (el.type === 'block' && el.h != null && Number.isNaN(toNum(el.h))) errs.push('« h » doit être un nombre.')
  if (el.size != null && Number.isNaN(toNum(el.size))) errs.push('« size » doit être un nombre.')
  if (el.offset != null && Number.isNaN(toNum(el.offset))) errs.push('« offset » doit être un nombre.')
  if (el.label_at != null && !isPt(el.label_at)) errs.push('« label_at » doit être un point [x, y].')
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

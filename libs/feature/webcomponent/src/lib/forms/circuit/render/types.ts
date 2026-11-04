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

export type V2 = [number, number]

/** Repère d'un dipôle : centre, direction, normale. */
export interface Frame {
  c: V2
  d: V2
  m: V2
  T: (lx: number, ly: number) => V2
}

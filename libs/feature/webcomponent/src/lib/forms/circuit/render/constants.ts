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

export const GATES = ['and', 'or', 'nand', 'nor', 'xor', 'xnor', 'not', 'buf']

export const UNITS: Record<string, string> = {
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
export const NAMES: Record<string, string> = {
  switch: 'Interrupteur',
  push: 'Bouton poussoir',
  selector: 'Commutateur',
  toggle: 'Entrée logique',
}

import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'
import { TableauRow } from './variation-table.utils'

export type { TableauPoint, TableauRow, TableauRowType } from './variation-table.utils'

export interface VariationTableState extends IWebComponent {
  /** Lignes du tableau ; la première est la ligne des valeurs de x. */
  rows: TableauRow[]
  /** L'élève peut-il ajouter ou supprimer des valeurs de x ? */
  resizable: boolean
  /** Nombre minimal de valeurs de x (bornes comprises). */
  minPoints: number
  /** Nombre maximal de valeurs de x (bornes comprises). */
  maxPoints: number
  /** Afficher les cases de valeurs (extremums, limites) dans les lignes de variations ? */
  values: boolean
  /** L'élève peut-il placer des valeurs interdites (double barre) ? */
  forbidden: boolean
  /** Désactiver le tableau ? */
  disabled: boolean
}

export const VariationTableComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'VariationTable',
  selector: 'wc-variation-table',
  description:
    "Tableau de signes et de variations d'une fonction, à compléter par l'élève (valeurs de x, signes, zéros et valeurs interdites, flèches de variation, extremums et limites saisis avec MathLive). Adapté aux études de fonctions du lycée et du supérieur, au signe d'un produit ou d'un quotient et au signe de la dérivée.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        default: [
          { type: 'x', label: 'x', points: ['-\\infty', '+\\infty'], intervals: [''], locked: ['p0', 'p1'] },
          { type: 'sign', label: "f'(x)", points: ['', ''], intervals: [''] },
          { type: 'variation', label: 'f(x)', points: ['', ''], intervals: [''] },
        ],
        description:
          "Les lignes du tableau. La première est la ligne des valeurs de x (`type: 'x'`), les suivantes des lignes de signes (`'sign'`) ou de variations (`'variation'`).",
        items: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['x', 'sign', 'variation'],
              description: 'La nature de la ligne.',
            },
            label: {
              type: 'string',
              default: '',
              description: "L'intitulé de la ligne en LaTeX (x, f'(x), f(x)...).",
            },
            points: {
              type: 'array',
              default: [],
              items: { type: ['string', 'array'], items: { type: 'string' } },
              description:
                "Une case par valeur de x. Ligne x : la valeur en LaTeX. Ligne de signes : '', '0' ou '||'. Ligne de variations : la valeur (extremum, limite) en LaTeX, ou [gauche, droite] pour une valeur interdite.",
            },
            intervals: {
              type: 'array',
              default: [],
              items: { type: 'string' },
              description:
                "Une case par intervalle entre deux valeurs de x. Ligne de signes : '', '+' ou '-'. Ligne de variations : '', 'up', 'down' ou 'const'.",
            },
            locked: {
              type: ['boolean', 'array'],
              default: false,
              items: { type: 'string' },
              description:
                "true pour figer toute la ligne, ou la liste des cases figées : 'p0' pour la première valeur, 'i1' pour le deuxième intervalle...",
            },
          },
        },
      },
      resizable: {
        type: 'boolean',
        default: false,
        description: "L'élève peut-il ajouter ou supprimer des valeurs de x ?",
      },
      minPoints: {
        type: 'number',
        default: 2,
        description: 'Le nombre minimal de valeurs de x, bornes comprises.',
      },
      maxPoints: {
        type: 'number',
        default: 8,
        description: 'Le nombre maximal de valeurs de x, bornes comprises.',
      },
      values: {
        type: 'boolean',
        default: true,
        description: 'Afficher les cases de valeurs (extremums, limites) dans les lignes de variations ?',
      },
      forbidden: {
        type: 'boolean',
        default: true,
        description: "L'élève peut-il placer des valeurs interdites (double barre) ?",
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver le tableau ?',
      },
    },
  },
  showcase: {
    resizable: true,
    rows: [
      { type: 'x', label: 'x', points: ['-\\infty', '-1', '1', '+\\infty'], intervals: ['', '', ''], locked: ['p0', 'p3'] },
      { type: 'sign', label: "f'(x)", points: ['', '0', '0', ''], intervals: ['+', '-', '+'] },
      {
        type: 'variation',
        label: 'f(x)',
        points: ['-\\infty', '2', '-2', '+\\infty'],
        intervals: ['up', 'down', 'up'],
      },
    ],
  },
  playgrounds: {
    'Variations d’un polynôme': 'polynome.ple',
    'Signe d’un quotient': 'quotient.ple',
  },
})
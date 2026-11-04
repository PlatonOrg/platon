import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'
import { CircuitSchema } from './render'

export interface CircuitState extends IWebComponent {
  schema: CircuitSchema
  value: Record<string, number>
  disabled: boolean
  scale: number
  caption: string
  hideHelp: boolean
}

export const CircuitComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'Circuit',
  selector: 'wc-circuit',
  description:
    "Affiche un schéma électrique décrit en JSON (dipôles, sources, semi-conducteurs, AOP, portes logiques, schémas-blocs) et permet de manœuvrer ses interrupteurs d'un clic. La valeur transmise au correcteur donne la position de tous les interrupteurs. En lecture seule, il sert de figure dans un énoncé ou une correction.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'Circuit',
    required: ['schema'],
    properties: {
      schema: {
        type: 'object',
        default: { unit: 40, elements: [] },
        description:
          'Le schéma : {"unit": 40, "elements": [...]}. Chaque élément a un type (R, C, L, V, switch, selector, npn, opamp, and...) et une position sur la grille (from/to pour un dipôle, at pour les autres). Voir la documentation.',
      },
      value: {
        type: 'object',
        default: {},
        description:
          'Position de chaque interrupteur, par identifiant : 0 ouvert, 1 fermé (switch, push, toggle) ; numéro de la borne (selector), -1 pour la position sans contact. Complétée automatiquement pour contenir tous les interrupteurs.',
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver le composant (mode revue).',
      },
      scale: {
        type: 'number',
        default: 1,
        description: "Facteur d'échelle de l'affichage (multiplie l'échelle éventuelle du schéma).",
      },
      caption: {
        type: 'string',
        default: '',
        description: 'Légende affichée sous le schéma.',
      },
      hideHelp: {
        type: 'boolean',
        default: false,
        description: "Masquer la ligne d'aide affichée sous un schéma interactif.",
      },
    },
  },
  showcase: {
    schema: {
      unit: 40,
      elements: [
        { type: 'V', id: 'E', from: [0, 4], to: [0, 0], value: 12, u: 'E' },
        { type: 'switch', id: 'K1', from: [0, 0], to: [3, 0] },
        {
          type: 'wire',
          points: [
            [3, 0],
            [4, 0],
          ],
        },
        { type: 'selector', id: 'K2', at: [4, 0], labels: ['1', '2'] },
        { type: 'lamp', id: 'L1', from: [6, -1], to: [9, -1] },
        { type: 'lamp', id: 'L2', from: [6, 1], to: [9, 1] },
        {
          type: 'wire',
          points: [
            [9, -1],
            [10, -1],
            [10, 4],
            [0, 4],
          ],
        },
        {
          type: 'wire',
          points: [
            [9, 1],
            [10, 1],
          ],
        },
      ],
    },
    value: { K1: 1, K2: 0 },
  },
  playgrounds: {
    'Allumer une lampe': 'lampe.ple',
    'Fonction logique': 'logique.ple',
  },
})

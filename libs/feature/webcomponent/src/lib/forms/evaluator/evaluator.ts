import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface EvaluatorState extends IWebComponent {
  title: string
  value: number
  count: number
  width: string | number
  height: string | number
  allowHalf: boolean
  icons: string | string[]
  filledIcons: boolean
  tooltips: string[]
  disabled: boolean
  autoValidation: boolean
}

export const EvaluatorComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'Evaluator',
  selector: 'wc-evaluator',
  description: 'Carte permettant de donner une note à un élément avec des étoiles ou autres icônes personnalisées.',
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'Evaluator',
    properties: {
      title: {
        type: 'string',
        default: '',
        description: 'Titre.',
      },
      value: {
        type: 'number',
        default: 0,
        description: 'Valeur sélectionnée.',
      },
      count: {
        type: 'number',
        default: 5,
        description: "Nombre d'éléments à afficher.",
      },
      width: {
        type: ['string', 'number'],
        default: '',
        description: 'Largeur.',
      },
      height: {
        type: ['string', 'number'],
        default: '',
        description: 'Hauteur.',
      },
      allowHalf: {
        type: 'boolean',
        default: false,
        description: 'Autoriser la sélection de demi-éléments?',
      },
      icons: {
        type: ['string', 'array'],
        default: 'star',
        description: 'Icône à afficher. Peut être une chaîne ou un tableau de chaînes.',
        items: {
          type: 'string',
          description: 'Icône à afficher.',
        },
      },
      filledIcons: {
        type: 'boolean',
        default: true,
        description: 'Afficher les icônes remplies? (Disponible uniquement pour les icônes compatibles)',
      },
      tooltips: {
        type: ['string', 'array'],
        default: '',
        description: "Texte d'info-bulle à afficher. Peut être une chaîne ou un tableau de chaînes.",
        items: {
          type: 'string',
          description: "Texte d'info-bulle à afficher.",
        },
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver la possibilité de choisir une valeur?',
      },
      autoValidation: {
        type: 'boolean',
        default: false,
        description: 'Activer la validation automatique?',
      },
    },
  },
  showcase: {
    title: 'Donnez une note',
  },
})

import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface WordSelectorItem {
  content: string
  css?: string
}

export interface WordSelectorState extends IWebComponent {
  words: (string | WordSelectorItem)[]
  selectedWords: (string | WordSelectorItem)[]
  disabled: boolean
  lengthWords: number
}

export const WordSelectorComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'WordSelector',
  selector: 'wc-word-selector',
  description:
    "Interface interactive pour sélectionner et organiser des mots afin de construire des phrases ou expressions. Idéal pour les exercices linguistiques comme la construction de phrases, l'apprentissage de langues étrangères, la mise en ordre syntaxique, ou pour des exercices de logique où l'ordre des éléments est important.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'WordSelector',
    properties: {
      words: {
        type: 'array',
        items: {
          type: ['string', 'object'],
          description: 'La liste initiale des mots disponibles.',
          properties: {
            content: {
              type: 'string',
              description: 'Le texte à afficher.',
            },
            css: {
              type: 'string',
              description: "Le style CSS à appliquer à l'étiquette.",
            },
          },
          required: ['content'],
        },
        default: [],
      },
      selectedWords: {
        type: 'array',
        items: {
          type: ['string', 'object'],
          description: "La liste des mots construits par l'utilisateur.",
          properties: {
            content: {
              type: 'string',
              description: 'Le texte à afficher.',
            },
            css: {
              type: 'string',
              description: "Le style CSS à appliquer à l'étiquette.",
            },
          },
          required: ['content'],
        },
        default: [],
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver le composant?',
      },
    },
  },
  showcase: {
    selectedWords: [],
    words: ["C'", 'est', 'mon', 'ami', 'il', 'vient', "d'", 'Australie', 'et', 'il', 'est', 'très', 'sympa'],
  },
})

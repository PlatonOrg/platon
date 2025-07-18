import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export type ClickDisplayMode = 'last-only' | 'all-points' | 'last-highlighted' | 'numbered-order' | 'deletion-status'

export interface ClickPoint {
  x: number
  y: number
  order: number
  allowDeletion?: boolean
}

export interface ImageClickerState extends IWebComponent {
  imageUrl?: string
  width?: string | number
  height?: string | number
  maxWidth?: string | number
  maxHeight?: string | number
  clickDisplayMode?: ClickDisplayMode
  defaultAllowDeletion?: boolean
  pointSize?: number
  pointOpacity?: number
  clickPoints?: ClickPoint[]
  autoValidation?: boolean
  disabled?: boolean
}

export const ImageClickerComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'ImageClicker',
  selector: 'wc-image-clicker',
  description:
    "Composant permettant de cliquer sur une image et d'afficher les points de clic selon différents modes d'affichage.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    required: ['imageUrl'],
    properties: {
      imageUrl: {
        type: 'string',
        title: 'Image URL',
        description: 'URL of the image to be displayed in the clicker.',
      },
      width: {
        type: ['string', 'number'],
        title: 'Largeur',
        description: "Largeur de l'image en valeur CSS (px, %, em, etc.) ou en pixels si un nombre est fourni.",
        default: '',
      },
      height: {
        type: ['string', 'number'],
        title: 'Hauteur',
        description: "Hauteur de l'image en valeur CSS (px, %, em, etc.) ou en pixels si un nombre est fourni.",
        default: '',
      },
      maxWidth: {
        type: ['string', 'number'],
        title: 'Largeur maximale',
        description:
          "Largeur maximale de l'image en valeur CSS (px, %, em, etc.) ou en pixels si un nombre est fourni.",
        default: '100%',
      },
      maxHeight: {
        type: ['string', 'number'],
        title: 'Hauteur maximale',
        description:
          "Hauteur maximale de l'image en valeur CSS (px, %, em, etc.) ou en pixels si un nombre est fourni.",
        default: '',
      },
      clickDisplayMode: {
        type: 'string',
        title: "Mode d'affichage des clics",
        description: "Définit comment les points de clic sont affichés sur l'image.",
        enum: ['last-only', 'all-points', 'last-highlighted', 'numbered-order', 'deletion-status'],
        default: 'all-points',
      },
      defaultAllowDeletion: {
        type: 'boolean',
        title: 'Nouveaux points supprimables par défaut',
        description: 'Détermine si les nouveaux points posés seront supprimables par défaut.',
        default: true,
      },
      pointSize: {
        type: 'number',
        title: 'Taille des points',
        description: 'Taille des points de clic en pixels.',
        default: 20,
        minimum: 5,
        maximum: 200,
      },
      pointOpacity: {
        type: 'number',
        title: 'Opacité des points',
        description: 'Opacité des points de clic (0 = transparent, 1 = opaque).',
        default: 1,
        minimum: 0.1,
        maximum: 1,
      },
      autoValidation: {
        type: 'boolean',
        title: 'Validation automatique',
        description: "Activer la validation automatique lors du clic sur l'image ?",
        default: false,
      },
      disabled: {
        type: 'boolean',
        title: 'Désactivé',
        description: "Empêche l'ajout et la suppression de points quand activé.",
        default: false,
      },
      clickPoints: {
        type: 'array',
        title: 'Points de clic',
        description: "Liste des points cliqués sur l'image avec leurs coordonnées normalisées (0-1000) et ordre.",
        default: [],
        items: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              description: 'Coordonnée X normalisée du point (0-1000)',
              minimum: 0,
              maximum: 1000,
            },
            y: {
              type: 'number',
              description: 'Coordonnée Y normalisée du point (0-1000)',
              minimum: 0,
              maximum: 1000,
            },
            order: {
              type: 'number',
              description: 'Ordre du point dans la séquence',
            },
            allowDeletion: {
              type: 'boolean',
              description: 'Autoriser la suppression de ce point',
              default: true,
            },
          },
          required: ['x', 'y', 'order'],
        },
      },
    },
  },
  showcase: {
    imageUrl: 'https://cdn.pixabay.com/photo/2018/04/25/09/26/eiffel-tower-3349075_960_720.jpg',
    width: '600px',
    height: '400px',
    clickDisplayMode: 'all-points',
    defaultAllowDeletion: true,
    pointSize: 20,
    pointOpacity: 1,
    autoValidation: false,
    disabled: false,
    clickPoints: [],
  },
})

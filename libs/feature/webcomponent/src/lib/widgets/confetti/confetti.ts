import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'
export interface ConfettiState extends IWebComponent {
  trigger: boolean
  mode: 'canon' | 'pride' | 'snowfall' | 'fireworks'
  colors: string[]
}

export const ConfettiComponentDefinition = defineWebComponent({
  type: WebComponentTypes.widget,
  name: 'Confetti',
  selector: 'wc-confetti',
  description: 'Un composant pour lancer des confettis.',
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'Confetti',
    //    required: ['data'],
    properties: {
      trigger: {
        type: 'boolean',
        title: 'Déclencheur de confettis',
        description: 'Activez pour lancer les confettis.',
        default: false,
      },
      mode: {
        type: 'string',
        title: 'Mode de confettis',
        description: 'Choisissez le mode de confettis.',
        enum: ['canon', 'pride', 'snowfall', 'fireworks'],
        default: 'canon',
      },
      colors: {
        type: 'array',
        title: 'Couleurs des confettis',
        description: 'Liste des couleurs des confettis.',
        items: {
          type: 'string',
          title: 'Couleur',
          description: 'Couleur du confetti, au format hexadécimal (ex: #ff0000).',
        },
        default: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      },
    },
  },
  showcase: {
    trigger: false,
    mode: 'canon',
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
  },
})

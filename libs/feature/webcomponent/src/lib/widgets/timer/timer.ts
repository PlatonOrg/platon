import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface TimerState extends IWebComponent {
  alignment: 'center' | 'left' | 'right'
  countDownTime: number
  disabled: boolean
}

export const TimerComponentDefinition = defineWebComponent({
  type: WebComponentTypes.widget,
  name: 'Timer',
  selector: 'wc-timer',
  description:
    "Compte à rebours qui soumet automatiquement la réponse de l'apprenant lorsque le temps est écoulé. Utile pour les exercices chronométrés, le calcul mental ou les questions éclair.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    required: [],
    properties: {
      countDownTime: {
        type: 'number',
        default: 0,
        description: 'Temps du compte à rebours en secondes.',
      },
      alignment: {
        type: 'string',
        enum: ['center', 'left', 'right'],
        default: 'center',
        description: 'Alignement du chronomètre.',
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver le chronomètre.',
      },
    },
  },
  showcase: {
    countDownTime: 120,
    alignment: 'right',
  },
  playgrounds: {
    'Calcul mental chronométré': 'mental-calculation.ple',
  },
})

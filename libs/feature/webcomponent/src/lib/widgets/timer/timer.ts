import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface TimerState extends IWebComponent {
  mode: 'chronometer' | 'countdown'
  alignment: 'center' | 'left' | 'right'
  countDownTime: number
  time: number
}

export const TimerComponentDefinition = defineWebComponent({
  type: WebComponentTypes.widget,
  name: 'Timer',
  selector: 'wc-timer',
  description:
    "Chronomètre qui affiche le temps écoulé depuis le début de l'exécution du composant ou qui fait un compte à rebours.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    required: ['mode'],
    properties: {
      mode: {
        type: 'string',
        enum: ['chronometer', 'countdown'],
        default: 'chronometer',
        description: 'Mode du chronomètre.',
      },
      countDownTime: {
        type: 'number',
        default: 0,
        description: 'Temps du compte à rebours en secondes.',
      },
      time: {
        type: 'number',
        default: 0,
        description: 'Temps écoulé en secondes.',
      },
      alignment: {
        type: 'string',
        enum: ['center', 'left', 'right'],
        default: 'center',
        description: 'Alignement du chronomètre.',
      },
    },
  },
  showcase: {
    mode: 'countdown',
    countDownTime: 120,
    alignment: 'right',
  },
})

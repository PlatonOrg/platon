import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface DisagreeSolutionButtonState extends IWebComponent {
  /**
   * Session ID of the exercise
   */
  sessionId?: string
  /**
   * Button text to display
   */
  text?: string
  /**
   * Button variant/style
   */
  variant?: 'primary' | 'default' | 'danger'
  /**
   * Whether the button is disabled
   */
  disabled?: boolean
}

export const DisagreeSolutionButtonComponentDefinition = defineWebComponent({
  type: WebComponentTypes.widget,
  name: 'Disagree Solution Button',
  selector: 'wc-disagree-solution-button',
  description:
    'Bouton permettant aux apprenants de signaler leur désaccord avec la solution proposée. Envoie automatiquement une notification au créateur de l\'exercice pour révision.',
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'ID de session de l\'exercice'
      },
      text: {
        type: 'string',
        default: 'Je pense que la solution est fausse',
        description: 'Texte à afficher sur le bouton'
      },
      variant: {
        type: 'string',
        default: 'default',
        description: 'Style du bouton',
        enum: ['primary', 'default', 'danger']
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver le bouton'
      }
    }
  },
  showcase: {
    text: 'Je pense que la solution est fausse',
    variant: 'default',
    disabled: false
  }
})
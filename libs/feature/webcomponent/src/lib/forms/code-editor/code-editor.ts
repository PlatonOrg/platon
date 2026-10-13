import { stripIndent } from 'common-tags'
import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface CodeEditorDecoration {
  startLineNumber: number
  startColumn?: number
  endLineNumber?: number
  endColumn?: number
  isWholeLine?: boolean
  severity?: 'error' | 'warning' | 'info'
  message?: string
}

export interface CodeEditorState extends IWebComponent {
  code: string
  height: number
  tabSize: number
  language: string
  quickSuggestions: boolean
  decorations?: CodeEditorDecoration[]
}

export const CodeEditorComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'CodeEditor',
  selector: 'wc-code-editor',
  description:
    "Éditeur de code complet avec coloration syntaxique pour multiples langages de programmation, indentation automatique et suggestions. Adapté aux exercices d'informatique comme la programmation, le débogage, la complétion de code, les algorithmes, ou l'analyse de code avec une interface professionnelle similaire aux IDE modernes.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'CodeEditor',
    properties: {
      code: {
        type: 'string',
        default: '',
        description: "Le contenu de l'éditeur.",
      },
      height: {
        type: 'number',
        default: 500,
        description: "Le hauteur de l'éditeur en px.",
      },
      tabSize: {
        type: 'number',
        default: 4,
        description: "Le nombre d'espaces correspondant à une tabulation.",
      },
      language: {
        type: 'string',
        default: 'plaintext',
        description: 'Le langage pour la coloration syntaxique.',
      },
      quickSuggestions: {
        type: 'boolean',
        default: true,
        description: "Activer l'auto-complétion des mots?",
      },
      decorations: {
        type: 'array',
        description:
          "Décorations à afficher dans l'éditeur. Sans colonnes de fin, toute la ligne (ou les lignes) est surlignée.",
        items: {
          type: 'object',
          properties: {
            startLineNumber: {
              type: 'integer',
              minimum: 1,
              description: 'Numéro de la première ligne (indexée à partir de 1).',
            },
            startColumn: {
              type: 'integer',
              minimum: 1,
              description: 'Colonne de début pour une décoration de plage.',
            },
            endLineNumber: {
              type: 'integer',
              minimum: 1,
              description: 'Numéro de la dernière ligne.',
            },
            endColumn: {
              type: 'integer',
              minimum: 1,
              description: 'Colonne de fin ; si elle est omise, la ligne entière est surlignée.',
            },
            isWholeLine: {
              type: 'boolean',
              description: 'Force le surlignage de la ou des lignes entières.',
            },
            severity: {
              type: 'string',
              enum: ['error', 'warning', 'info'],
              default: 'error',
              description: 'Couleur de la décoration.',
            },
            message: {
              type: 'string',
              description: 'Message affiché au survol de la décoration.',
            },
          },
          required: ['startLineNumber'],
        },
      },
    },
  },
  showcase: {
    language: 'python',
    code: stripIndent`
        # This program adds two numbers

        num1 = 1.5
        num2 = 6.3

        # Add two numbers
        sum = num1 + num2

        # Display the sum
        print('The sum of {0} and {1} is {2}'.format(num1, num2, sum))
        `,
    decorations: [
      {
        startLineNumber: 3,
        startColumn: 1,
        endLineNumber: 3,
        endColumn: 20,
        severity: 'error',
        message: 'This is an error decoration.',
      },
      {
        startLineNumber: 7,
        startColumn: 1,
        endLineNumber: 7,
        severity: 'warning',
        message: 'This is a warning decoration.',
      },
    ],
  },
})

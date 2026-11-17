import { stripIndent } from 'common-tags'
import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface CodeViewerState extends IWebComponent {
  code: string
  lines: string
  language: string
  highlights: string
}

export const CodeViewerComponentDefinition = defineWebComponent({
  type: WebComponentTypes.widget,
  name: 'CodeViewer',
  selector: 'wc-code-viewer',
  description:
    "Composant d'affichage de code source avec coloration syntaxique, numérotation et surlignage de lignes. Idéal pour les exercices d'analyse de code, de débogage, d'explication d'algorithmes ou pour présenter des exemples de programmation avec mise en évidence des sections importantes.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'CodeViewer',
    required: ['code', 'language'],
    properties: {
      code: { type: 'string', default: '', description: 'Code à afficher.' },
      lines: {
        type: 'string',
        default: '',
        description: 'Numéros de ligne à afficher.',
      },
      language: {
        type: 'string',
        default: 'plaintext',
        description: 'Langage du code.',
      },
      highlights: {
        type: 'string',
        default: '',
        description: 'Lignes à surligner.',
      },
    },
  },
  showcase: {
    language: 'python',
    lines: '1',
    highlights: '4 7 9-10',
    code: stripIndent`
        # This program adds two numbers

        num1 = 1.5
        num2 = 6.3

        # Add two numbers
        sum = num1 + num2

        # Display the sum
        print('The sum of {0} and {1} is {2}'.format(num1, num2, sum))
        `,
  },
  playgrounds: {
    'Exécuter un programme à la main': 'trace.ple',
  },
})

/** The `lines` property: a step, positive integer. */
const isLinesStep = (lines: string) => /^\d+$/.test(lines) && Number(lines) >= 1

/** The `highlights` property: line numbers and ranges, as "2 4-5". */
const isHighlights = (highlights: string) => /^\d+(-\d+)?(\s+\d+(-\d+)?)*$/.test(highlights)

/**
 * Lists the invalid properties of the state, which are ignored when the code is displayed.
 * @param state The state of the component.
 * @returns A message for each invalid property.
 */
export const codeViewerWarnings = (state: CodeViewerState): string[] => {
  const warnings: string[] = []
  const lines = state.lines?.trim()
  if (lines && !isLinesStep(lines)) {
    warnings.push(`Valeur de lines invalide : « ${lines} ». Attendu : un entier positif, par exemple « 1 » ou « 5 ».`)
  }
  const highlights = state.highlights?.trim()
  if (highlights && !isHighlights(highlights)) {
    warnings.push(
      `Valeur de highlights invalide : « ${highlights} ». Attendu : des numéros ou des plages de lignes, par exemple « 2 4-5 ».`
    )
  }
  return warnings
}

/**
 * Checks that the language is known to Monaco, which colorizes the code (by its id or an alias,
 * as the markdown colorizer does).
 * @param language The `language` property.
 * @param languages The languages registered in Monaco.
 */
export const codeViewerLanguageSupported = (
  language: string | undefined,
  languages: { id: string; aliases?: string[] }[]
): boolean => !language || languages.some((known) => known.id === language || known.aliases?.includes(language))

/**
 * Converts the `lines` property (a step: "1" numbers each line, "5" every 5 lines) to the
 * `lines` attribute of a markdown code block, which lists the numbered lines.
 * @param lines The step, as written by the author.
 * @param lineCount The number of lines of the code.
 * @returns The attribute value, or an empty string when no line is numbered.
 */
export const codeViewerLines = (lines: string, lineCount: number): string => {
  if (!isLinesStep(lines?.trim() ?? '')) {
    return ''
  }
  const step = Number(lines)
  if (step === 1) {
    return '1' // a single number means "this line and the following ones"
  }
  const numbers = Array.from({ length: Math.floor(lineCount / step) }, (_, i) => (i + 1) * step)
  // A single number would also mean "this line and the following ones": it is repeated.
  return (numbers.length === 1 ? [...numbers, ...numbers] : numbers).join(' ')
}

/**
 * Writes the code of the state as a markdown code block, with the line numbers and highlights.
 * @param state The state of the component.
 * @returns The markdown to render.
 */
export const codeViewerMarkdown = (state: CodeViewerState): string => {
  const code = state.code ?? ''
  // The fence is longer than any run of backticks of the code, so that the code can't close it.
  const longestRun = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(Math.max(3, longestRun + 1))
  const lines = codeViewerLines(state.lines, code.split('\n').length)
  const attributes = [
    state.language || 'plaintext',
    lines ? `lines="${lines}"` : '',
    isHighlights(state.highlights?.trim() ?? '') ? `highlights="${state.highlights.trim()}"` : '',
  ]
  return `${fence}${attributes.filter(Boolean).join(' ')}\n${code}\n${fence}\n`
}

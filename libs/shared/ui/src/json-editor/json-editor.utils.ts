import { isJsonObject, isJsonObjectOrArray, parseJsonLenient } from '@platon/shared/utils'
import type { JsonEditorComponent } from 'ang-jsoneditor'

/** Result of {@link readJsonFromClipboard}. */
export type ClipboardJsonResult =
  /** The browser refused the access to the clipboard. */
  | { status: 'denied' }
  /** The clipboard does not contain an accepted JSON value. `message` explains why, in French. */
  | { status: 'invalid'; message: string }
  /** `repaired` is true when the text was not valid JSON and had to be fixed: the user should check the result. */
  | { status: 'ok'; value: Record<string, unknown> | unknown[]; repaired: boolean }

/**
 * Reads the clipboard and parses its content as a JSON object (or array when `allowArrays` is set),
 * tolerating the usual mistakes of hand-written JSON (see `parseJsonLenient`).
 */
export async function readJsonFromClipboard(options: { allowArrays: boolean }): Promise<ClipboardJsonResult> {
  let text: string
  try {
    text = await navigator.clipboard.readText()
  } catch {
    return { status: 'denied' }
  }

  const expected = options.allowArrays ? 'un objet { ... } ou un tableau [ ... ]' : 'un objet { ... }'
  let result: ReturnType<typeof parseJsonLenient>
  try {
    result = parseJsonLenient(text)
  } catch {
    return { status: 'invalid', message: 'Le presse-papier ne contient pas de JSON valide.' }
  }

  // A text which is not JSON at all is "repaired" into a string.
  if (result.repaired && typeof result.value === 'string') {
    return { status: 'invalid', message: 'Le presse-papier ne contient pas de JSON valide.' }
  }

  const accepted = options.allowArrays ? isJsonObjectOrArray(result.value) : isJsonObject(result.value)
  if (!accepted) {
    return { status: 'invalid', message: `Le JSON collé doit être ${expected}.` }
  }

  return { status: 'ok', value: result.value as Record<string, unknown> | unknown[], repaired: result.repaired }
}

/** Message to show when the pasted JSON had to be repaired. */
export const REPAIRED_JSON_MESSAGE =
  'Le JSON collé contenait des erreurs et a été corrigé automatiquement : vérifiez le résultat (Ctrl+Z pour annuler).'

/**
 * Displays the line breaks (`\n`) of the string values of a tree mode editor as real line breaks.
 *
 * The values are rendered with text nodes: their content must never be interpreted as HTML since
 * it comes from user files (it would allow script injection).
 */
export function renderJsonEditorLineBreaks(editor?: JsonEditorComponent): void {
  const container = editor?.jsonEditorContainer()?.nativeElement as HTMLElement | undefined
  container?.querySelectorAll<HTMLElement>('.jsoneditor-value.jsoneditor-string').forEach((node) => {
    const text = node.textContent ?? ''
    if (!text.includes('\\n')) return
    node.replaceChildren(
      ...text
        .split('\\n')
        .flatMap((part, i) =>
          i ? [document.createElement('br'), document.createTextNode(part)] : [document.createTextNode(part)]
        )
    )
  })
}

/** Name of the history action registered by {@link replaceJsonEditorValue}. */
const REPLACE_ACTION = 'platonReplaceDocument'

/**
 * Replaces the whole content of a tree mode editor as a single action of its history,
 * so that it can be undone with Ctrl+Z or the undo button, and triggers its change event.
 * Uses a plain `set` in the other modes (without undo).
 *
 * Relies on the internal API of `jsoneditor` (its history and `_onAction`). The built-in `update` and
 * "transform" action are not used: their undo corrupts the keys of the root object when they change.
 */
export function replaceJsonEditorValue(editor: JsonEditorComponent, value: unknown): void {
  const instance = editor.getEditor()
  const history = instance?.history
  if (editor.getMode() !== 'tree' || !Array.isArray(history?.history) || typeof instance._onAction !== 'function') {
    editor.set(value as JSON)
    return
  }

  // `set` rebuilds the whole document (keeping the order of the keys) but clears the history: restore it.
  // It does not fire any change event: `_onAction` and the undo/redo handlers of the editor do it.
  const setDocument = (json: unknown) => {
    const { history: entries, index } = history
    instance.set(json)
    history.history = entries
    history.index = index
  }

  history.actions[REPLACE_ACTION] ??= {
    undo: (params: { oldValue: unknown }) => setDocument(params.oldValue),
    redo: (params: { newValue: unknown }) => setDocument(params.newValue),
  }

  const oldValue = instance.get()
  const newValue = structuredClone(value)
  setDocument(newValue)
  instance._onAction(REPLACE_ACTION, { oldValue, newValue })
}

/**
 * Switches the editor to the tree mode. The text mode may contain invalid JSON, which makes the switch
 * fail: in this case, its content is first replaced by `fallback` (the last valid value).
 */
export function switchJsonEditorToTreeMode(editor: JsonEditorComponent, fallback: unknown): void {
  if (editor.getMode() === 'tree') return
  if (!editor.isValidJson()) {
    editor.set(fallback as JSON)
  }
  editor.setMode('tree')
}

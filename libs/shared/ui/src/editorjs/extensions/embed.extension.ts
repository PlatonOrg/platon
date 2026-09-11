import { ToolConstructable } from '@editorjs/editorjs'
import Embed from '@editorjs/embed'
import { EDITOR_JS_EXTENSION, EditorJsExtension } from '../editorjs'

const Extension: EditorJsExtension = {
  tools: {
    embed: {
      class: Embed as unknown as ToolConstructable,
    },
  },
}

export const EmbedExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useValue: Extension,
}

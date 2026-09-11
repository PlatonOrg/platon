import { EDITOR_JS_EXTENSION, EditorJsExtension } from '../editorjs'
import { CalloutTool } from './callout.tool'

const Extension: EditorJsExtension = {
  tools: {
    callout: {
      class: CalloutTool,
    },
  },
}

export const CalloutExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useValue: Extension,
}

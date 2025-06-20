import AceCodeEditorJS from 'ace-code-editorjs'
import { EditorJsExtension, EDITOR_JS_EXTENSION } from '../editorjs'
import ace from 'ace-builds'
import 'ace-builds/esm-resolver'

import modeHTMLWorker from 'ace-builds/src-noconflict/worker-html?url'
ace.config.setModuleUrl('ace/mode/html_worker', modeHTMLWorker)
const aceConfig = {
  languages: {
    html: {
      label: 'HTML',
      mode: 'ace/mode/html',
    },
    python: {
      mode: 'ace/mode/python',
      label: 'Python',
    },
    javascript: {
      mode: 'ace/mode/javascript',
      label: 'JavaScript',
    },
    typescript: {
      mode: 'ace/mode/typescript',
      label: 'TypeScript',
    },
    java: {
      mode: 'ace/mode/java',
      label: 'Java',
    },
    plaintext: {
      mode: 'ace/mode/plain_text',
      label: 'Plain Text',
    },
    sh: {
      mode: 'ace/mode/sh',
      label: 'Shell Script',
    },
  },
}

const Extension: EditorJsExtension = {
  tools: {
    code: {
      class: AceCodeEditorJS,
      config: aceConfig,
    },
  },
}

export const CodeExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useValue: Extension,
}

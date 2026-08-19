/* eslint-disable @typescript-eslint/no-explicit-any */

import { Inject, Injectable, Optional } from '@angular/core'

import EditorJS, { OutputData, ToolConstructable, ToolSettings } from '@editorjs/editorjs'

import DragDrop from 'editorjs-drag-drop'
import Undo from 'editorjs-undo'

import { EDITOR_JS_EXTENSION, EditorJsExtension } from './editorjs'

@Injectable()
export class EditorJsService {
  constructor(
    @Optional()
    @Inject(EDITOR_JS_EXTENSION)
    private readonly extensions: EditorJsExtension[] = []
  ) {}

  newInstance(options: {
    data?: OutputData
    holder?: string
    readOnly?: boolean
    minHeight?: number
    onChange?: () => void | Promise<void>
    extraTools?: Record<string, ToolConstructable | ToolSettings>
  }): EditorJS {
    const editor = new EditorJS({
      data: options.data,
      autofocus: true,
      holder: options.holder || 'editorjs',
      inlineToolbar: true,
      minHeight: options.minHeight || 50,
      logLevel: 'ERROR' as any,
      readOnly: options.readOnly,
      // extraTools est fusionné en dernier pour pouvoir surcharger une clé déjà enregistrée
      // globalement (ex. remplacer le `image` par URL par un `image` avec upload réel).
      tools: Object.assign(
        (this.extensions || [])
          .map((ext) => ext.tools)
          .reduce((tools, ext) => {
            Object.assign(tools, ext)
            return tools
          }, {} as any),
        options.extraTools
      ),
      onReady: () => {
        new Undo({ editor })
        new DragDrop(editor)
      },
      onChange: options.onChange,
    })
    return editor
  }
}

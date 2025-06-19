import Header from '@editorjs/header'
import Paragraph from '@editorjs/paragraph'
import TextVariant from '@editorjs/text-variant-tune'
import Underline from '@editorjs/underline'
import { StyleInlineTool } from 'editorjs-style'
import TextAlignment from 'editorjs-text-alignment-blocktune'
import ColorPlugin from 'editorjs-text-color-plugin'
import { EditorJsExtension, EDITOR_JS_EXTENSION } from '../editorjs'

const Extension: EditorJsExtension = {
  tools: {
    header: {
      class: Header,
      inlineToolbar: true,
      tunes: ['textVariant', 'textAlignment'],
    },
    paragraph: {
      class: Paragraph,
      inlineToolbar: true,
      tunes: ['textVariant', 'textAlignment'],
    },

    style: {
      class: StyleInlineTool,
    },
    Color: {
      class: ColorPlugin,
      config: {
        defaultColor: '#ff1300',
        type: 'text',
        customPicker: true,
      },
    },
    Marker: {
      class: ColorPlugin,
      config: {
        defaultColor: '#ff1300',
        type: 'marker',
      },
    },
    underline: {
      class: Underline,
      inlineToolbar: true,
    },
    textVariant: {
      class: TextVariant,
    },
    textAlignment: {
      class: TextAlignment,
      config: {
        default: 'left',
      },
    },
  },
}

export const TextExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useValue: Extension,
}

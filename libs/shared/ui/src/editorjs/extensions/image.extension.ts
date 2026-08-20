import { Optional } from '@angular/core'
import SimpleImage from '@editorjs/simple-image'
import ImageTool from '@editorjs/image'
import { EditorJsExtension, EDITOR_JS_EXTENSION } from '../editorjs'
import { EditorJsImageUploader } from '../editorjs-image-uploader'

export const buildImageExtension = (uploader: EditorJsImageUploader | null): EditorJsExtension => {
  if (!uploader) {
    return {
      tools: {
        image: {
          class: SimpleImage,
        },
      },
    }
  }

  return {
    tools: {
      image: {
        class: ImageTool,
        config: {
          endpoints: {},
          uploader: {
            uploadByFile: (file: Blob) => uploader.uploadByFile(file),
            uploadByUrl: (url: string) => uploader.uploadByUrl(url),
          },
        },
      },
    },
  }
}

export const ImageExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useFactory: buildImageExtension,
  deps: [[new Optional(), EditorJsImageUploader]],
}

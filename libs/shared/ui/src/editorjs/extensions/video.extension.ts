import { Optional } from '@angular/core'
import { EditorJsExtension, EDITOR_JS_EXTENSION } from '../editorjs'
import { EditorJsFileUploader } from '../editorjs-file-uploader'
import { VideoTool } from './video.tool'

export const buildVideoExtension = (uploader: EditorJsFileUploader | null): EditorJsExtension => {
  return {
    tools: {
      video: {
        class: VideoTool,
        config: {
          uploader: uploader
            ? {
                uploadByFile: (file: Blob) => uploader.uploadByFile(file),
                uploadByUrl: (url: string) => uploader.uploadByUrl(url),
              }
            : undefined,
        },
      },
    },
  }
}

export const VideoExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useFactory: buildVideoExtension,
  deps: [[new Optional(), EditorJsFileUploader]],
}

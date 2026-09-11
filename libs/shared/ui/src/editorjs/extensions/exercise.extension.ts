import { Optional } from '@angular/core'
import { EditorJsExtension, EDITOR_JS_EXTENSION } from '../editorjs'
import { EditorJsExercisePicker } from '../editorjs-exercise-picker'
import { ExerciseTool } from './exercise.tool'

export const buildExerciseExtension = (picker: EditorJsExercisePicker | null): EditorJsExtension => {
  return {
    tools: {
      exercise: {
        class: ExerciseTool,
        config: {
          picker: picker
            ? {
                pick: () => picker.pick(),
              }
            : undefined,
        },
      },
    },
  }
}

export const ExerciseExtension = {
  provide: EDITOR_JS_EXTENSION,
  multi: true,
  useFactory: buildExerciseExtension,
  deps: [[new Optional(), EditorJsExercisePicker]],
}

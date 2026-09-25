export const EXERCISE_PREVIEW_RESIZE = 'EXERCISE_PREVIEW_RESIZE'

export interface ExercisePreviewResizeMessage {
  readonly type: typeof EXERCISE_PREVIEW_RESIZE
  readonly height: number
}

export const isExercisePreviewResizeMessage = (data: unknown): data is ExercisePreviewResizeMessage => {
  const message = data as Partial<ExercisePreviewResizeMessage> | null
  return (
    !!message &&
    message.type === EXERCISE_PREVIEW_RESIZE &&
    typeof message.height === 'number' &&
    Number.isFinite(message.height) &&
    message.height > 0
  )
}

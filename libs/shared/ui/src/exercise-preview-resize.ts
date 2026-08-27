// Protocole postMessage entre la page /player/preview/:id (émetteur, apps/web) et les endroits qui
// l'embarquent en iframe dans un bloc "exercise" (récepteurs : ExerciseTool pour l'éditeur,
// EditorjsViewerComponent pour la lecture seule) — permet à l'iframe de s'ajuster à la hauteur
// réelle du contenu plutôt que d'imposer un scroll interne sur les exercices longs.
export const EXERCISE_PREVIEW_RESIZE = 'EXERCISE_PREVIEW_RESIZE'

export interface ExercisePreviewResizeMessage {
  readonly type: typeof EXERCISE_PREVIEW_RESIZE
  readonly height: number
}

export const isExercisePreviewResizeMessage = (data: unknown): data is ExercisePreviewResizeMessage => {
  const message = data as Partial<ExercisePreviewResizeMessage> | null
  return !!message && message.type === EXERCISE_PREVIEW_RESIZE && typeof message.height === 'number'
}

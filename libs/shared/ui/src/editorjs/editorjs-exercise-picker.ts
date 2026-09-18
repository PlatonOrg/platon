export interface EditorJsExercisePickResult {
  readonly resourceId: string
  readonly resourceVersion: string
  readonly title: string
}

export abstract class EditorJsExercisePicker {
  abstract pick(): Promise<EditorJsExercisePickResult | null>
}

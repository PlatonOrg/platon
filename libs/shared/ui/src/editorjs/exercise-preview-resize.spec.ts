import { EXERCISE_PREVIEW_RESIZE, isExercisePreviewResizeMessage } from './exercise-preview-resize'

describe('isExercisePreviewResizeMessage', () => {
  it('accepte un message valide', () => {
    expect(isExercisePreviewResizeMessage({ type: EXERCISE_PREVIEW_RESIZE, height: 480 })).toBe(true)
  })

  it('rejette un type ou une hauteur absente', () => {
    expect(isExercisePreviewResizeMessage(null)).toBe(false)
    expect(isExercisePreviewResizeMessage({})).toBe(false)
    expect(isExercisePreviewResizeMessage({ type: EXERCISE_PREVIEW_RESIZE })).toBe(false)
    expect(isExercisePreviewResizeMessage({ type: 'AUTRE_TYPE', height: 480 })).toBe(false)
  })

  it.each([NaN, Infinity, -Infinity, -1, 0, '480'])('rejette une hauteur invalide (%p)', (height) => {
    expect(isExercisePreviewResizeMessage({ type: EXERCISE_PREVIEW_RESIZE, height })).toBe(false)
  })
})

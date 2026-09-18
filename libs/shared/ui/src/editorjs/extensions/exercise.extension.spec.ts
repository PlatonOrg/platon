import { buildExerciseExtension } from './exercise.extension'
import { EditorJsExercisePicker } from '../editorjs-exercise-picker'

describe('buildExerciseExtension', () => {
  it("ne fournit pas de picker au bloc exercise quand aucun n'est injecté", () => {
    const extension = buildExerciseExtension(null)
    const config = (extension.tools?.['exercise'] as any).config

    expect(config.picker).toBeUndefined()
  })

  it("délègue à l'EditorJsExercisePicker fourni via un objet plat (pas l'instance brute)", async () => {
    const result = { resourceId: 'abc', resourceVersion: '1', title: 'Mon exercice' }
    const picker: EditorJsExercisePicker = {
      pick: jest.fn().mockResolvedValue(result),
    }

    const extension = buildExerciseExtension(picker)
    const config = (extension.tools?.['exercise'] as any).config

    expect(config.picker).not.toBe(picker)

    await expect(config.picker.pick()).resolves.toBe(result)
    expect(picker.pick).toHaveBeenCalled()
  })
})

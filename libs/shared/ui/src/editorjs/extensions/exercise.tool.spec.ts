import { ExerciseTool } from './exercise.tool'
import { EditorJsExercisePicker } from '../editorjs-exercise-picker'

describe('ExerciseTool', () => {
  it("affiche le bouton de choix quand aucun exercice n'est encore sélectionné", () => {
    const tool = new ExerciseTool({ data: {} } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-exercise__button')?.textContent).toBe('Choisir un exercice')
    expect(wrapper.querySelector('.ce-exercise__frame')).toBeNull()
  })

  it('affiche directement l’iframe quand un exercice est déjà sélectionné', () => {
    const tool = new ExerciseTool({
      data: { resourceId: 'abc', resourceVersion: '3', title: 'Mon exercice' },
    } as any)
    const wrapper = tool.render()

    const iframe = wrapper.querySelector('.ce-exercise__frame') as HTMLIFrameElement
    expect(iframe.getAttribute('src')).toBe('/player/preview/abc?version=3&autoResize=true')
    expect(wrapper.querySelector('.ce-exercise__title')?.textContent).toBe('Mon exercice')
  })

  it("retombe sur la version 'latest' quand aucune version n'est fournie", () => {
    const tool = new ExerciseTool({ data: { resourceId: 'abc', resourceVersion: '' } } as any)
    const wrapper = tool.render()

    const iframe = wrapper.querySelector('.ce-exercise__frame') as HTMLIFrameElement
    expect(iframe.getAttribute('src')).toBe('/player/preview/abc?version=latest&autoResize=true')
  })

  it('appelle picker.pick() au clic sur le bouton et affiche l’exercice choisi', async () => {
    const result = { resourceId: 'xyz', resourceVersion: '2', title: 'Exercice choisi' }
    const picker: EditorJsExercisePicker = {
      pick: jest.fn().mockResolvedValue(result),
    }
    const tool = new ExerciseTool({ data: {}, config: { picker } } as any)
    const wrapper = tool.render()

    wrapper.querySelector<HTMLButtonElement>('.ce-exercise__button')?.click()
    expect(picker.pick).toHaveBeenCalled()

    await Promise.resolve()
    await Promise.resolve()

    const iframe = wrapper.querySelector('.ce-exercise__frame') as HTMLIFrameElement
    expect(iframe.getAttribute('src')).toBe('/player/preview/xyz?version=2&autoResize=true')
    expect(tool.save()).toEqual(result)
  })

  it('ne change rien quand picker.pick() résout avec null (annulation)', async () => {
    const picker: EditorJsExercisePicker = {
      pick: jest.fn().mockResolvedValue(null),
    }
    const tool = new ExerciseTool({ data: {}, config: { picker } } as any)
    const wrapper = tool.render()

    wrapper.querySelector<HTMLButtonElement>('.ce-exercise__button')?.click()
    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.querySelector('.ce-exercise__frame')).toBeNull()
    expect(wrapper.querySelector('.ce-exercise__button')).not.toBeNull()
  })

  it('affiche un bouton pour changer d’exercice une fois un exercice sélectionné (mode édition)', () => {
    const picker: EditorJsExercisePicker = { pick: jest.fn() }
    const tool = new ExerciseTool({ data: { resourceId: 'abc', resourceVersion: '1' }, config: { picker } } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-exercise__change-button')).not.toBeNull()
  })

  it('ne montre pas de bouton pour changer d’exercice en lecture seule', () => {
    const picker: EditorJsExercisePicker = { pick: jest.fn() }
    const tool = new ExerciseTool({
      data: { resourceId: 'abc', resourceVersion: '1' },
      config: { picker },
      readOnly: true,
    } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-exercise__change-button')).toBeNull()
  })

  it('save() renvoie les données courantes', () => {
    const tool = new ExerciseTool({
      data: { resourceId: 'abc', resourceVersion: '1', title: 'Titre' },
    } as any)
    tool.render()

    expect(tool.save()).toEqual({ resourceId: 'abc', resourceVersion: '1', title: 'Titre' })
  })
})

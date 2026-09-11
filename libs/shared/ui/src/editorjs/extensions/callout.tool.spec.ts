import { CalloutTool } from './callout.tool'

describe('CalloutTool', () => {
  it('applique la variante info par défaut quand aucune donnée initiale', () => {
    const tool = new CalloutTool({ data: {} } as any)
    const wrapper = tool.render()

    expect(wrapper.dataset['variant']).toBe('info')
  })

  it('reprend la variante et le texte fournis à la construction', () => {
    const tool = new CalloutTool({ data: { variant: 'important', text: 'Ne pas oublier' } } as any)
    const wrapper = tool.render()

    expect(wrapper.dataset['variant']).toBe('important')
    expect(wrapper.querySelector('.ce-callout__text')?.innerHTML).toBe('Ne pas oublier')
  })

  it('change de variante au clic sur un bouton du sélecteur', () => {
    const tool = new CalloutTool({ data: { variant: 'info', text: '' } } as any)
    const wrapper = tool.render()

    const dialogueButton = wrapper.querySelectorAll<HTMLButtonElement>('.ce-callout__variant-button')[2]
    dialogueButton.click()

    expect(wrapper.dataset['variant']).toBe('dialogue')
    expect(dialogueButton.classList.contains('ce-callout__variant-button--active')).toBe(true)
  })

  it('save() lit la variante courante et le texte édité dans le DOM', () => {
    const tool = new CalloutTool({ data: { variant: 'info', text: 'Départ' } } as any)
    const wrapper = tool.render()

    wrapper.querySelectorAll<HTMLButtonElement>('.ce-callout__variant-button')[1].click()
    const textElement = wrapper.querySelector('.ce-callout__text') as HTMLElement
    textElement.innerHTML = 'Texte modifié'

    expect(tool.save()).toEqual({ variant: 'important', text: 'Texte modifié' })
  })

  it('ne rend pas le sélecteur de variantes ni contenteditable en lecture seule', () => {
    const tool = new CalloutTool({ data: { variant: 'info', text: 'Lecture seule' }, readOnly: true } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-callout__variants')).toBeNull()
    expect((wrapper.querySelector('.ce-callout__text') as HTMLElement).contentEditable).toBe('false')
  })
})

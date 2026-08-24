import { VideoTool } from './video.tool'
import { EditorJsFileUploader } from '../editorjs-file-uploader'

describe('VideoTool', () => {
  it("affiche uniquement le champ URL quand aucun uploader n'est fourni", () => {
    const tool = new VideoTool({ data: {} } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-video__file-input')).toBeNull()
    expect(wrapper.querySelector('.ce-video__url-input')).not.toBeNull()
  })

  it('affiche aussi le bouton de sélection de fichier quand un uploader est fourni', () => {
    const uploader: EditorJsFileUploader = { uploadByFile: jest.fn(), uploadByUrl: jest.fn() }
    const tool = new VideoTool({ data: {}, config: { uploader } } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-video__file-input')).not.toBeNull()
  })

  it('affiche directement le lecteur quand une url est déjà présente', () => {
    const tool = new VideoTool({ data: { url: 'https://example.com/v.mp4', caption: 'Légende' } } as any)
    const wrapper = tool.render()

    const video = wrapper.querySelector('.ce-video__player') as HTMLVideoElement
    expect(video.getAttribute('src')).toBe('https://example.com/v.mp4')
    expect(wrapper.querySelector('.ce-video__caption')?.innerHTML).toBe('Légende')
  })

  it('save() retourne url et légende éditée', () => {
    const tool = new VideoTool({ data: { url: 'https://example.com/v.mp4', caption: 'Départ' } } as any)
    const wrapper = tool.render()

    const caption = wrapper.querySelector('.ce-video__caption') as HTMLElement
    caption.innerHTML = 'Texte modifié'

    expect(tool.save()).toEqual({ url: 'https://example.com/v.mp4', caption: 'Texte modifié' })
  })

  it("accepte une URL collée directement sans uploader (pas d'aller-retour serveur)", () => {
    const tool = new VideoTool({ data: {} } as any)
    const wrapper = tool.render()

    const urlInput = wrapper.querySelector('.ce-video__url-input') as HTMLInputElement
    urlInput.value = 'https://example.com/v.mp4'
    urlInput.dispatchEvent(new Event('blur'))

    expect(wrapper.querySelector('.ce-video__player')).not.toBeNull()
    expect(tool.save().url).toBe('https://example.com/v.mp4')
  })

  it('déclenche aussi la soumission au appui sur Entrée dans le champ URL', () => {
    const tool = new VideoTool({ data: {} } as any)
    const wrapper = tool.render()

    const urlInput = wrapper.querySelector('.ce-video__url-input') as HTMLInputElement
    urlInput.value = 'https://example.com/v.mp4'
    urlInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(wrapper.querySelector('.ce-video__player')).not.toBeNull()
  })

  it("délègue le collage d'URL à uploadByUrl quand un uploader est fourni", async () => {
    const response = { success: 1 as const, file: { url: 'https://cdn.example.com/v.mp4' } }
    const uploader: EditorJsFileUploader = {
      uploadByFile: jest.fn(),
      uploadByUrl: jest.fn().mockResolvedValue(response),
    }
    const tool = new VideoTool({ data: {}, config: { uploader } } as any)
    const wrapper = tool.render()

    const urlInput = wrapper.querySelector('.ce-video__url-input') as HTMLInputElement
    urlInput.value = 'https://example.com/original.mp4'
    urlInput.dispatchEvent(new Event('blur'))

    expect(uploader.uploadByUrl).toHaveBeenCalledWith('https://example.com/original.mp4')
    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.querySelector('.ce-video__player')).not.toBeNull()
    expect(tool.save().url).toBe('https://cdn.example.com/v.mp4')
  })

  it('appelle uploadByFile quand un fichier est sélectionné', async () => {
    const response = { success: 1 as const, file: { url: 'https://cdn.example.com/v.mp4' } }
    const uploader: EditorJsFileUploader = {
      uploadByFile: jest.fn().mockResolvedValue(response),
      uploadByUrl: jest.fn(),
    }
    const tool = new VideoTool({ data: {}, config: { uploader } } as any)
    const wrapper = tool.render()

    const fileInput = wrapper.querySelector('.ce-video__file-input') as HTMLInputElement
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' })
    Object.defineProperty(fileInput, 'files', { value: [file] })
    fileInput.dispatchEvent(new Event('change'))

    expect(uploader.uploadByFile).toHaveBeenCalledWith(file)
    await Promise.resolve()
    await Promise.resolve()

    expect(tool.save().url).toBe('https://cdn.example.com/v.mp4')
  })

  it("affiche une erreur et revient au formulaire en cas d'échec d'upload", async () => {
    const uploader: EditorJsFileUploader = {
      uploadByFile: jest.fn(),
      uploadByUrl: jest.fn().mockRejectedValue(new Error('boom')),
    }
    const tool = new VideoTool({ data: {}, config: { uploader } } as any)
    const wrapper = tool.render()

    const urlInput = wrapper.querySelector('.ce-video__url-input') as HTMLInputElement
    urlInput.value = 'https://example.com/v.mp4'
    urlInput.dispatchEvent(new Event('blur'))

    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.querySelector('.ce-video__error')).not.toBeNull()
    expect(wrapper.querySelector('.ce-video__url-input')).not.toBeNull()
  })

  it('ne montre ni formulaire ni légende vide en lecture seule', () => {
    const tool = new VideoTool({ data: { url: 'https://example.com/v.mp4' }, readOnly: true } as any)
    const wrapper = tool.render()

    expect(wrapper.querySelector('.ce-video__form')).toBeNull()
    expect(wrapper.querySelector('.ce-video__caption')).toBeNull()
  })

  it('affiche la légende non éditable en lecture seule quand elle existe', () => {
    const tool = new VideoTool({
      data: { url: 'https://example.com/v.mp4', caption: 'Ma légende' },
      readOnly: true,
    } as any)
    const wrapper = tool.render()

    const caption = wrapper.querySelector('.ce-video__caption') as HTMLElement
    expect(caption.contentEditable).toBe('false')
    expect(caption.innerHTML).toBe('Ma légende')
  })
})

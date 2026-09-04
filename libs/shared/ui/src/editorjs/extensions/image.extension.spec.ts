import { buildImageExtension } from './image.extension'
import { EditorJsFileUploader } from '../editorjs-file-uploader'

describe('buildImageExtension', () => {
  it("utilise le bloc image en mode URL uniquement quand aucun uploader n'est fourni", () => {
    const extension = buildImageExtension(null)

    expect(extension.tools?.['image']).toEqual({ class: expect.any(Function) })
  })

  it('branche un vrai upload de fichier quand un EditorJsImageUploader est fourni', async () => {
    const response = { success: 1 as const, file: { url: '/files/abc.png' } }
    const uploader: EditorJsFileUploader = {
      uploadByFile: jest.fn().mockResolvedValue(response),
      uploadByUrl: jest.fn(),
    }

    const extension = buildImageExtension(uploader)
    const config = (extension.tools?.['image'] as any).config

    const file = new Blob(['x'])
    await expect(config.uploader.uploadByFile(file)).resolves.toBe(response)
    expect(uploader.uploadByFile).toHaveBeenCalledWith(file)
  })

  it("délègue aussi le collage d'une URL d'image externe (ex: image libre de droit trouvée sur le web)", async () => {
    const response = { success: 1 as const, file: { url: 'https://example.com/photo.jpg' } }
    const uploader: EditorJsFileUploader = {
      uploadByFile: jest.fn(),
      uploadByUrl: jest.fn().mockResolvedValue(response),
    }

    const extension = buildImageExtension(uploader)
    const config = (extension.tools?.['image'] as any).config

    await expect(config.uploader.uploadByUrl('https://example.com/photo.jpg')).resolves.toBe(response)
    expect(uploader.uploadByUrl).toHaveBeenCalledWith('https://example.com/photo.jpg')
  })
})

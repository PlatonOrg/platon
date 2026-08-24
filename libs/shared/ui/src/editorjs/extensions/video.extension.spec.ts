import { buildVideoExtension } from './video.extension'
import { EditorJsFileUploader } from '../editorjs-file-uploader'

describe('buildVideoExtension', () => {
  it("configure le bloc video sans uploader quand aucun n'est fourni (mode URL uniquement)", () => {
    const extension = buildVideoExtension(null)
    const config = (extension.tools?.['video'] as any).config

    expect(extension.tools?.['video']).toEqual({ class: expect.any(Function), config: { uploader: undefined } })
    expect(config.uploader).toBeUndefined()
  })

  it("délègue à l'uploader fourni via un objet plat (pas l'instance brute)", async () => {
    const uploader: EditorJsFileUploader = {
      uploadByFile: jest.fn().mockResolvedValue({ success: 1, file: { url: 'https://cdn.example.com/v.mp4' } }),
      uploadByUrl: jest.fn().mockResolvedValue({ success: 1, file: { url: 'https://cdn.example.com/v.mp4' } }),
    }

    const extension = buildVideoExtension(uploader)
    const config = (extension.tools?.['video'] as any).config

    expect(config.uploader).not.toBe(uploader)

    const file = new Blob(['x'])
    await expect(config.uploader.uploadByFile(file)).resolves.toEqual({
      success: 1,
      file: { url: 'https://cdn.example.com/v.mp4' },
    })
    expect(uploader.uploadByFile).toHaveBeenCalledWith(file)

    await expect(config.uploader.uploadByUrl('https://example.com/v.mp4')).resolves.toEqual({
      success: 1,
      file: { url: 'https://cdn.example.com/v.mp4' },
    })
    expect(uploader.uploadByUrl).toHaveBeenCalledWith('https://example.com/v.mp4')
  })
})

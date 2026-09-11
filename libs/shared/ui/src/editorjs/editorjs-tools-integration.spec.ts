import { Injector, runInInjectionContext } from '@angular/core'
import { EDITOR_JS_EXTENSION } from './editorjs'
import { EditorJsService } from './editorjs.service'
import { CalloutExtension } from './extensions/callout.extension'
import { DelimiterExtension } from './extensions/delimiter.extension'
import { EmbedExtension } from './extensions/embed.extension'
import { buildImageExtension } from './extensions/image.extension'
import { ListExtension } from './extensions/list.extension'
import { RawExtension } from './extensions/raw.extension'
import { TableExtension } from './extensions/table.extension'
import { TextExtension } from './extensions/text.extension'
import { buildVideoExtension } from './extensions/video.extension'

describe('EditorJS tools integration', () => {
  beforeEach(() => {
    window.matchMedia =
      window.matchMedia ||
      (((): MediaQueryList =>
        ({
          matches: false,
          addListener: () => undefined,
          removeListener: () => undefined,
        } as unknown as MediaQueryList)) as unknown as typeof window.matchMedia)
  })

  it("n'empêche pas les autres blocs (ex: header) de se charger quand un uploader riche (instance de composant) est fourni", async () => {
    document.body.innerHTML = '<div id="diag"></div>'

    class RichUploader {
      uploadByFile = jest.fn().mockResolvedValue({ success: 1, file: { url: 'https://cdn.example.com/f' } })
      uploadByUrl = jest.fn().mockResolvedValue({ success: 1, file: { url: 'https://cdn.example.com/f' } })
      unrelatedAngularInternals = { changeDetectorRef: {}, subscriptions: [] }
    }
    const uploader = new RichUploader()

    const extensions = [
      (CalloutExtension as any).useValue,
      (DelimiterExtension as any).useValue,
      (EmbedExtension as any).useValue,
      (ListExtension as any).useValue,
      (RawExtension as any).useValue,
      (TableExtension as any).useValue,
      (TextExtension as any).useValue,
      buildImageExtension(uploader),
      buildVideoExtension(uploader),
    ]
    const injector = Injector.create({
      providers: extensions.map((extension) => ({ provide: EDITOR_JS_EXTENSION, useValue: extension, multi: true })),
    })
    const service = runInInjectionContext(injector, () => new EditorJsService())

    const editor = service.newInstance({
      data: {
        time: Date.now(),
        blocks: [
          { type: 'header', data: { text: 'Titre', level: 2 } },
          { type: 'paragraph', data: { text: 'Un paragraphe' } },
        ],
        version: '2.30.8',
      },
      holder: 'diag',
    })

    await expect(editor.isReady).resolves.toBeUndefined()

    const saved = await editor.save()
    expect(saved.blocks.map((b) => b.type)).toEqual(['header', 'paragraph'])
  })
})

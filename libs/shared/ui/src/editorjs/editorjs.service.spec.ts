import EditorJS from '@editorjs/editorjs'
import { EditorJsExtension } from './editorjs'
import { EditorJsService } from './editorjs.service'

jest.mock('@editorjs/editorjs', () => jest.fn().mockImplementation(() => ({ destroy: jest.fn() })))

describe('EditorJsService', () => {
  const buildService = (extensions: EditorJsExtension[]): EditorJsService => new EditorJsService(extensions)

  afterEach(() => jest.clearAllMocks())

  const lastConfiguredTools = (): Record<string, unknown> => {
    const mock = EditorJS as unknown as jest.Mock
    return mock.mock.calls[mock.mock.calls.length - 1][0].tools
  }

  it('merges tools from every injected extension', () => {
    const service = buildService([{ tools: { toolA: {} as any } }, { tools: { toolB: {} as any } }])
    service.newInstance({})

    expect(Object.keys(lastConfiguredTools())).toEqual(expect.arrayContaining(['toolA', 'toolB']))
  })
})

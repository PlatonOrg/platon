import * as FileUtils from './file-preview'
import { EditFilePreviewService } from './file-preview-edition-service'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace monaco.editor {
    interface ITextModel {
      getValue(): string
      dispose(): void
      onDidChangeContent(callback: () => any): { dispose(): void }
    }
  }
}
describe('EditFilePreviewService', () => {
  let service: EditFilePreviewService
  const contentModel = 'content from monaco editor'
  const mockEditor = {
    getValue: jest.fn().mockReturnValue(contentModel),
    onDidChangeContent: jest.fn(),
    dispose: jest.fn(),
  }
  beforeEach(() => {
    // eslint-disable-next-line prettier/prettier
    ;(global as any).monaco = {
      // disable prettier otherwise ask to add ';' before "(global ..." but not happy to start the function with ';'
      editor: {
        createModel: jest.fn().mockReturnValue(mockEditor),
      },
    }
    service = new EditFilePreviewService()
  })

  afterEach(() => {
    delete (global as any).monaco
    jest.restoreAllMocks()
  })

  describe('Extension support', () => {
    it('should identify editable extensions', () => {
      const spy = jest.spyOn(FileUtils, 'extractSupportedExtension')
      spy.mockReturnValue('txt')
      expect(service.isEditable('test.txt')).toBe(true)
      spy.mockReturnValue('json')
      expect(service.isEditable('test.json')).toBe(true)
      spy.mockReturnValue('csv')
      expect(service.isEditable('test.csv')).toBe(true)
      spy.mockReturnValue('md')
      expect(service.isEditable('test.md')).toBe(true)
      spy.mockReturnValue('exe')
      expect(service.isEditable('test.exe')).toBe(false)
      spy.mockReturnValue('vcs')
      expect(service.isEditable('test.vcs')).toBe(false)
      spy.mockRestore()
    })
  })

  describe('Clear model', () => {
    it('should clear the model.', () => {
      const id = 'test1'
      service.setCurrentContent(id, 'data')
      service.createModel(id)
      expect(service.getModel(id)).toBeDefined()
      service.clearModel(id)
      expect(service.getModel(id)).toBeUndefined()
      expect(service.getCurrentFileContent(id)).toBe('')
      expect(mockEditor.dispose).toHaveBeenCalled()
    })
  })

  describe('Recover data', () => {
    const id = 'test2'
    it("should give the saved version then the model content after it's creation ", () => {
      service.setCurrentContent(id, 'saved version')
      expect(service.data(id)).toBe('saved version')
      service.createModel(id)
      expect(service.data(id)).toBe(contentModel)
    })
  })
})

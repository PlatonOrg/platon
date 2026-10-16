import { Router } from '@angular/router'
import * as FileUtils from './file-preview'
import { EditFilePreviewService } from './file-preview-edition-service'
import { TestBed } from '@angular/core/testing'

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
  const resourceId = '123'
  const mockRouter = {
    routerState: {
      snapshot: {
        root: {
          firstChild: null,
          paramMap: {
            get: jest.fn().mockReturnValue(resourceId),
            has: jest.fn().mockReturnValue(true),
          },
        },
      },
    },
  }

  beforeEach(() => {
    ;(global as any).monaco = {
      // disable prettier otherwise ask to add ';' before "(global ..." but not happy to start the function with ';'
      editor: {
        createModel: jest.fn().mockReturnValue(mockEditor),
      },
    }

    TestBed.configureTestingModule({
      providers: [
        EditFilePreviewService,
        {
          provide: Router,
          useValue: mockRouter,
        },
      ],
    })
    service = TestBed.inject(EditFilePreviewService)
  })

  afterEach(() => {
    delete (global as any).monaco
    jest.restoreAllMocks()
  })

  describe('Extension support', () => {
    beforeEach(() => {
      mockRouter.routerState.snapshot.root.paramMap.get.mockReturnValue(resourceId)
    })

    it('should identify editable extensions', () => {
      // expect : /api/v1/files/{resource Id}/includes/{file name}?download&version={resource version} as src
      const spy = jest.spyOn(FileUtils, 'extractSupportedExtension')
      const path = `/api/v1/files/${resourceId}/includes/`
      spy.mockReturnValue('txt')
      expect(service.isEditable(`${path}test.txt`)).toBe(true)
      spy.mockReturnValue('json')
      expect(service.isEditable(`${path}test.json`)).toBe(true)
      spy.mockReturnValue('csv')
      expect(service.isEditable(`${path}test.csv`)).toBe(true)
      spy.mockReturnValue('md')
      expect(service.isEditable(`${path}test.md`)).toBe(true)
      spy.mockReturnValue('exe')
      expect(service.isEditable(`${path}test.exe`)).toBe(false)
      spy.mockReturnValue('vcs')
      expect(service.isEditable(`${path}test.vcs`)).toBe(false)
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

  describe('isEditable', () => {
    // expect : /api/v1/files/{resource Id}/includes/{file name}?download&version={resource version} as file src
    const currentResourceId = '123'
    const currentResourceFile = `/api/v1/files/${currentResourceId}/includes/file.txt?dowload&version=latest`
    const inheritedResourceFile = `/api/v1/files/999/file.txt?dowload&version=latest`

    beforeEach(() => {
      mockRouter.routerState.snapshot.root.paramMap.get.mockReturnValue(currentResourceId)
    })

    it('should return true for a editable file belonging to the current resource', () => {
      jest.spyOn(FileUtils, 'extractSupportedExtension').mockReturnValue('txt')
      expect(service.isEditable(currentResourceFile)).toBe(true)
    })

    it('should return false if the file belongs to an inherited resource (different ID)', () => {
      jest.spyOn(FileUtils, 'extractSupportedExtension').mockReturnValue('txt')
      expect(service.isEditable(inheritedResourceFile)).toBe(false)
    })

    it('should return false for an uneditable file extension', () => {
      jest.spyOn(FileUtils, 'extractSupportedExtension').mockReturnValue('exe')
      expect(service.isEditable(currentResourceFile)).toBe(false)
    })

    it('should return false if no route id is available', () => {
      mockRouter.routerState.snapshot.root.paramMap.get.mockReturnValue(null)
      jest.spyOn(FileUtils, 'extractSupportedExtension').mockReturnValue('txt')
      expect(service.isEditable(currentResourceFile)).toBe(false)
    })
  })
})

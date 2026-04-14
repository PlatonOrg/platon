import { ActivatedRoute } from '@angular/router'
import { EditFilePreviewService } from '@platon/shared/ui'
import { signal, NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { InputFileService } from '@platon/feature/resource/browser'
import { FileService, EditorService, NotificationService } from '@cisstech/nge-ide/core'
import { VALUE_EDITOR_TOKEN } from '../../ple-input'
import { ValueEditorComponent } from './value-editor.component'
import { HideResourceIdPipe } from './value-editor.component'

describe('ValueEditorComponent', () => {
  let component: ValueEditorComponent
  let fixture: ComponentFixture<ValueEditorComponent>

  const mockEditService = {
    isEditing: signal(false),
    getModel: jest.fn(),
    getCurrentFileContent: jest.fn(),
    clearModel: jest.fn(),
    data: jest.fn(),
    requestRefresh: jest.fn(),
    setCurrentContent: jest.fn(),
  }
  const mockInputFileService = {
    isModeBuilder: jest.fn().mockReturnValue(true),
    resourceVersion: jest.fn().mockReturnValue('latest'),
    urlFile: jest.fn().mockReturnValue('https://localhost/resources'),
    update: jest.fn((id, data, success) => success()),
    change: jest.fn().mockResolvedValue('test-file.txt'),
  }

  const mockFileService = {
    refresh: jest.fn().mockResolvedValue(undefined),
  }

  const mockEditorService = {
    activeResource: { authority: 'test:latest' },
    open: jest.fn().mockResolvedValue(undefined),
  }

  const mockNotificationService = {
    publishError: jest.fn(),
  }

  beforeEach(async () => {
    // eslint-disable-next-line prettier/prettier
    (global as any).monaco = {
      Uri: {
        parse: jest.fn().mockReturnValue({
          authority: 'test:latest',
          path: '/file',
          toString: () => 'test:latest/file',
        }),
      },
    }

    await TestBed.configureTestingModule({
      declarations: [ValueEditorComponent, HideResourceIdPipe],
      providers: [
        { provide: EditFilePreviewService, useValue: mockEditService },
        { provide: InputFileService, useValue: mockInputFileService },
        { provide: FileService, useValue: mockFileService },
        { provide: EditorService, useValue: mockEditorService },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '123' } },
          },
        },
        {
          provide: VALUE_EDITOR_TOKEN,
          useValue: () => {
            // empty
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()

    fixture = TestBed.createComponent(ValueEditorComponent)
    component = fixture.componentInstance
    component.setValue('@copycontent /test/path')
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('Change mode', () => {
    it('should set isEditing to true', async () => {
      await component.changeMode()
      expect(mockEditService.isEditing()).toBe(true)
    })
  })

  describe('save change', () => {
    it('should update content and refresh the service', () => {
      const testUrl = 'https://localhost/resources'
      const testData = 'new content'
      component.url = testUrl
      mockEditService.data.mockReturnValue(testData)
      component.saveChange(false)
      expect(mockInputFileService.update).toHaveBeenCalled()
      expect(mockEditService.setCurrentContent).toHaveBeenCalledWith(testUrl, testData)
      expect(mockEditService.isEditing()).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('should clean the model in the service when destroyed', () => {
      component.url = 'https://localhost/resources'
      component.ngOnDestroy()
      expect(mockEditService.clearModel).toHaveBeenCalledWith('https://localhost/resources')
    })
  })

  describe('closelEdit', () => {
    it('should restore content if model has changed', () => {
      const mockModel = {
        getValue: jest.fn().mockReturnValue('modified'),
        getFullModelRange: jest.fn(),
        pushEditOperations: jest.fn(),
      }
      component.url = 'url1'
      mockEditService.getModel.mockReturnValue(mockModel)
      mockEditService.getCurrentFileContent.mockReturnValue('original')
      component.closelEdit()
      expect(mockModel.pushEditOperations).toHaveBeenCalled()
      expect(mockEditService.isEditing()).toBe(false)
    })
  })

  describe('onDrop', () => {
    it('should upload a new file when a file is dropped from outside', async () => {
      const mockFile = new File(['content'], 'test-file.txt', { type: 'text/plain' })
      const dndData = { file: mockFile } as any
      mockInputFileService.change.mockResolvedValue('test-file.txt')
      component.setValue('')
      component.inputId = 'input-1'
      component.id = 'res-123'
      await (component as any).onDrop(dndData)

      expect(mockInputFileService.change).toHaveBeenCalledWith('input-1', mockFile)
      expect((component as any).value).toContain('@copycontent /res-123:latest/test-file.txt')
    })

    it('should update the path when an internal resource is dropped', async () => {
      const dndData = {
        file: undefined,
        src: 'file:///path/to/resource.txt',
      } as any
      const mockPresenter = {
        resolvePath: jest.fn().mockReturnValue('/internal/path/resource.txt'),
      }
      ;(component as any).editorPresenter = mockPresenter
      ;(component as any).editorService = mockEditorService
      await (component as any).onDrop(dndData)

      expect(mockPresenter.resolvePath).toHaveBeenCalled()
      expect((component as any).value).toBe('@copycontent /internal/path/resource.txt')
    })
  })
})

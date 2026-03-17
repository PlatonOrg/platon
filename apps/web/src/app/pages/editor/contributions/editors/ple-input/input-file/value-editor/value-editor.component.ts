import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Pipe,
  PipeTransform,
  ViewChild,
  inject,
  OnDestroy,
} from '@angular/core'
import { DndData, EditorService, NotificationService, FileService } from '@cisstech/nge-ide/core'
import { EditorPresenter } from '../../../../../editor.presenter'
import { ResourceFileSystemProvider } from '../../../../file-system'
import { BaseValueEditor } from '../../ple-input'
import { ActivatedRoute } from '@angular/router'
import { InputFileService } from '@platon/feature/resource/browser'
import { UiFilePreviewComponent, EditFilePreviewService, UiModalTemplateComponent } from '@platon/shared/ui'

@Pipe({ name: 'hideResourceId' })
export class HideResourceIdPipe implements PipeTransform {
  transform(value?: string | null): string | null | undefined {
    if (!value) {
      return value
    }
    return value.replace(/\/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}:[^/]+\//, '')
  }
}

@Component({
  selector: 'app-input-file-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueEditorComponent extends BaseValueEditor<string> implements OnDestroy {
  private readonly editorService = inject(EditorService, { optional: true })
  private readonly editorPresenter = inject(EditorPresenter, { optional: true })
  private readonly fileSystemProvider = inject(ResourceFileSystemProvider, { optional: true })
  private readonly notificationService = inject(NotificationService, { optional: true })
  private readonly inputFileService = inject(InputFileService) // file gestion
  private readonly fileService = inject(FileService) // to refresh file explorer for ple
  public readonly editService = inject(EditFilePreviewService) // to update file when editing

  modeBuilder = false // true if is the builder editor false otherwise
  @Input() inputId = '' // name of the component in the list of component

  id = this.route.snapshot.paramMap.get('id') // ressource id
  version = 'latest'
  watchContent = false // display file content for plo
  isDragging = false
  url = ''
  fileContent = ''

  @ViewChild(UiModalTemplateComponent) modalComponent!: UiModalTemplateComponent

  /**  */
  constructor(private route: ActivatedRoute) {
    super()
    this.modeBuilder = this.inputFileService.isModeBuilder()
    this.version = this.inputFileService.resourceVersion()
    this.editService.isEditing.set(false)
    this.url = this.getUrl()
  }

  /** close the editor */
  closelEdit() {
    const model = this.editService.getModel(this.url)
    const savedContent = this.editService.getCurrentFileContent(this.url)

    if (model && model.getValue() !== savedContent) {
      // change the content and keep the ctrl-z
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: savedContent,
          },
        ],
        () => null
      )
    }
    this.editService.isEditing.set(false)
    this.changeDetectorRef.detectChanges()
  }

  /** swap between editing and view mode */
  async changeMode() {
    this.editService.isEditing.set(true)
    this.changeDetectorRef.detectChanges()
  }

  protected get isUrl(): boolean {
    return !!this.value?.startsWith('@copyurl')
  }

  protected get isContent(): boolean {
    return !!this.value?.startsWith('@copycontent')
  }

  override setValue(value: string): void {
    super.setValue(typeof value === 'string' && value.match(/^@copycontent\s|@copyurl\s/) ? value : '')
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging = false
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging = true
  }

  private async uploadFile(data: DndData) {
    if (data.file === undefined) {
      return // should never append
    }
    let name = data.file.name
    const newName = await this.inputFileService.change(this.inputId, data.file)
    if (newName != '') {
      name = newName // new file name (can change if a file with the same name is already there)
    }
    let type = this.value?.split('/')[0].trim() // keep the type
    if (type === '') {
      type = '@copycontent'
    }
    const newValue = type + ' /' + this.id + ':latest/' + name
    this.setValue((this.value = newValue))
    this.notifyValueChange?.(this.value)
    if (!this.modeBuilder) {
      await this.fileService.refresh()
    }
    const newUrl = this.getUrl()
    if (this.url != newUrl) {
      this.editService.clearModel(this.url)
      this.url = newUrl
    }
  }

  protected async onDrop(data: DndData) {
    this.isDragging = false
    if (this.disabled) {
      return
    }
    if (data.file) {
      await this.uploadFile(data) // add from outside platon
    } else {
      if (!this.editorService) {
        return
      }
      const { activeResource } = this.editorService // file already in platon

      if (!activeResource || !data.src || !this.editorPresenter || !this.editorService) {
        return
      }

      const uri = monaco.Uri.parse(data.src)

      let path = ''
      try {
        path = this.editorPresenter.resolvePath(uri, activeResource, true)
        if (path) {
          void this.changeValue((this.value = `@copycontent ${path}`))
        }
      } catch (error) {
        if (this.notificationService) {
          this.notificationService.publishError(error)
        }
      }
    }
  }

  protected async changeValue(value: string) {
    if (this.modeBuilder && value == '') {
      void this.inputFileService.remove(this.inputId) // clic on cross icon on builder page
      this.editService.clearModel(this.url)
      this.url = ''
    }
    this.notifyValueChange?.((this.value = value))
  }

  protected switchToUrl() {
    void this.changeValue(this.value?.replace('@copycontent', '@copyurl') || '')
  }

  protected switchToContent() {
    void this.changeValue(this.value?.replace('@copyurl', '@copycontent') || '')
  }

  /** give the download url of the file */
  protected getUrl(): string {
    if (this.editService.isEditing()) {
      return this.url
    }
    const url = this.value ? this.inputFileService.urlFile(this.value) : ''
    this.url = url
    return url
  }

  /** distinct ple case (open the file) from plo case (preview)*/
  protected eyeButton() {
    if (this.modeBuilder) {
      this.watchContent = !this.watchContent
    } else {
      this.openFile()
    }
  }

  protected openFile() {
    const reference = (this.value?.replace(/@copycontent|@copyurl/g, '') || '').trim()
    if (!this.fileSystemProvider || !this.editorService) {
      return
    }
    if (!reference.startsWith('/')) {
      const [resource, _] = (this.editorService.activeResource as monaco.Uri).authority.split(':')
      const uri = this.fileSystemProvider.buildUri(resource, this.version, reference)
      this.editorService.open(uri).catch(console.error)
      return
    }

    // first element is empty string since the string starts with a slash
    const [, authority, path] = reference.split('/')
    const [resource, _] = authority.split(':') // version is alway latest so doesn't work for other version
    const uri = this.fileSystemProvider.buildUri(resource, this.version, path)
    this.editorService.open(uri).catch(console.error)
  }

  @ViewChild('editorPreview') editeur!: UiFilePreviewComponent
  /** save the file after edition
   * @param
   * keepEdit  true to stay in the editor, false otherwise
   */
  saveChange(keepEdit: boolean) {
    const data = this.editService.data(this.url)
    this.inputFileService.update(this.inputId, data, () => {
      this.editService.isEditing.set(keepEdit)
      this.editService.requestRefresh()
      this.editService.setCurrentContent(this.url, this.editService.data(this.url))
      this.changeDetectorRef.detectChanges()
      if (this.value) {
        this.notifyValueChange?.(this.value)
      }
    })
  }

  /** remove the editor from the service */
  ngOnDestroy() {
    this.editService.clearModel(this.url)
  }

  /** close the preview, change the editor content for the saved content*/
  closePreview() {
    const model = this.editService.getModel(this.url)
    const savedContent = this.editService.getCurrentFileContent(this.url)
    if (model && model.getValue() !== savedContent) {
      //  keep the ctrl-z
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: savedContent,
          },
        ],
        () => null
      )
    }
    this.watchContent = false
    this.editService.isEditing.set(false)
    this.changeDetectorRef.detectChanges()
  }
}

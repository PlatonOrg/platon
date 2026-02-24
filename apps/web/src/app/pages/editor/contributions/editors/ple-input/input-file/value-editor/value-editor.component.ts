import { ChangeDetectionStrategy, Component, Input, Pipe, PipeTransform, inject } from '@angular/core'
import { DndData, EditorService, NotificationService, FileService } from '@cisstech/nge-ide/core'
import { EditorPresenter } from '../../../../../editor.presenter'
import { ResourceFileSystemProvider } from '../../../../file-system'
import { BaseValueEditor } from '../../ple-input'
import { ActivatedRoute } from '@angular/router'
import { InputFileService } from '@platon/feature/resource/browser'

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
export class ValueEditorComponent extends BaseValueEditor<string> {
  private readonly editorService = inject(EditorService, { optional: true })
  private readonly editorPresenter = inject(EditorPresenter, { optional: true })
  private readonly fileSystemProvider = inject(ResourceFileSystemProvider, { optional: true })
  private readonly notificationService = inject(NotificationService, { optional: true })
  private readonly inputFileService = inject(InputFileService) // file gestion
  private readonly fileService = inject(FileService) // to refresh file explorer for ple

  modeBuilder = false // true if is the builder editor false otherwise
  @Input() inputId = '' // name of the component in the list of component

  id = this.route.snapshot.paramMap.get('id') // ressource id
  version = 'latest'
  watchContent = false // display file content for plo
  isDragging = false

  constructor(private route: ActivatedRoute) {
    super()
    this.modeBuilder = this.inputFileService.isModeBuilder()
    this.version = this.inputFileService.resourceVersion()
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
    return this.value ? this.inputFileService.urlFile(this.value) : ''
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
}

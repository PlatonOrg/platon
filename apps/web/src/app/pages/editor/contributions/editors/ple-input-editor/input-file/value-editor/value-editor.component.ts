import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { DndData, EditorService, NotificationService } from '@cisstech/nge-ide/core'
import { EditorPresenter } from '../../../../../editor.presenter'
import { BaseValueEditor } from '../../ple-input'
import { ResourceFileSystemProvider } from '../../../../file-system'
import { removeLeadingSlash } from '@platon/core/common'

@Component({
  selector: 'app-input-file-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputFileValueEditorComponent extends BaseValueEditor<string> {
  private readonly editorService = inject(EditorService)
  private readonly editorPresenter = inject(EditorPresenter)
  private readonly fileSystemProvider = inject(ResourceFileSystemProvider)
  private readonly notificationService = inject(NotificationService)

  protected get isUrl(): boolean {
    return !!this.value?.startsWith('@copyurl')
  }

  protected get isContent(): boolean {
    return !!this.value?.startsWith('@copycontent')
  }

  constructor() {
    super()
  }

  override setValue(value: string): void {
    super.setValue(typeof value === 'string' && value.match(/^@copycontent\s|@copyurl\s/) ? value : '')
  }

  protected onDrop(data: DndData) {
    if (this.disabled) {
      return
    }

    if (data.src) {
      const uri = monaco.Uri.parse(data.src)

      const { owner, opened } = this.editorPresenter.findOwnerResource(uri)
      if (!owner) {
        this.notificationService.publishError('Impossible de copier le fichier')
        return
      }

      if (opened) {
        this.changeValue((this.value = `@copycontent ${removeLeadingSlash(uri.path)}`))
      } else {
        const version = uri.authority.split(':')[1]
        this.changeValue((this.value = `@copycontent /${owner.code}:${version}${uri.path}`))
      }
    }
  }

  protected changeValue(value: string) {
    this.notifyValueChange?.((this.value = value))
  }

  protected switchToUrl() {
    this.changeValue(this.value?.replace('@copycontent', '@copyurl') || '')
  }

  protected switchToContent() {
    this.changeValue(this.value?.replace('@copyurl', '@copycontent') || '')
  }

  protected openFile() {
    const reference = (this.value?.replace(/@copycontent|@copyurl/g, '') || '').trim()
    if (!reference.startsWith('/')) {
      const [resource, version] = (this.editorService.activeResource as monaco.Uri).authority.split(':')
      const uri = this.fileSystemProvider.buildUri(resource, version, reference)
      this.editorService.open(uri)
      return
    }

    // first element is empty string since the string starts with a slash
    const [, authority, path] = reference.split('/')
    const [resource, version] = authority.split(':')
    const uri = this.fileSystemProvider.buildUri(resource, version, path)
    this.editorService.open(uri)
  }
}

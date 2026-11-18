import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { DialogService } from '@platon/core/browser'
import {
  REPAIRED_JSON_MESSAGE,
  readJsonFromClipboard,
  renderJsonEditorLineBreaks,
  replaceJsonEditorValue,
  switchJsonEditorToTreeMode,
} from '@platon/shared/ui'
import { isJsonObject, isJsonObjectOrArray } from '@platon/shared/utils'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { JsonEditorComponent, JsonEditorOptions, JsonEditorTreeNode } from 'ang-jsoneditor'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { firstValueFrom } from 'rxjs'
import { BaseValueEditor } from '../../ple-input'

/** Fields of a webcomponent state that must never be edited. */
const READONLY_COMPONENT_FIELDS = ['cid', 'selector']

/** Values accepted by the JSON input. */
type JsonValue = Record<string, unknown> | unknown[]

@Component({
  selector: 'app-input-json-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonEditorComponent, NzButtonModule, NzTooltipModule, MatIconModule],
})
export class ValueEditorComponent extends BaseValueEditor<JsonValue> implements OnInit {
  private readonly resourceLoader = inject(ResourceLoaderService)
  private readonly dialogService = inject(DialogService)
  protected readonly editorOptions = new JsonEditorOptions()

  @ViewChild(JsonEditorComponent)
  protected editor!: JsonEditorComponent

  private lastValidValue?: JsonValue

  constructor() {
    super()
    this.editorOptions.modes = this.disabled ? ['view'] : ['tree', 'code']
    this.editorOptions.mode = this.disabled ? 'view' : 'tree'
    this.editorOptions.language = 'fr-FR'
    this.editorOptions.mainMenuBar = true
    this.editorOptions.navigationBar = false
    this.editorOptions.statusBar = false
    this.editorOptions.enableSort = false
    this.editorOptions.enableTransform = false
    this.editorOptions.sortObjectKeys = false

    this.editorOptions.onEditable = (e) => {
      if (this.disabled) return false
      if (!this.isComponent()) return true
      const node = e as JsonEditorTreeNode
      if (READONLY_COMPONENT_FIELDS.includes(`${node.field}`)) return false
      return true
    }

    this.editorOptions.onBlur = () => renderJsonEditorLineBreaks(this.editor)
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.resourceLoader.loadAllAsync([['style', 'assets/vendors/jsoneditor/jsoneditor.min.css']]))
  }

  override setValue(value: JsonValue): void {
    const validValue = isJsonObjectOrArray(value) ? value : {}
    this.lastValidValue = validValue
    super.setValue(validValue)
  }

  override setDisabled(disabled: boolean): void {
    if (this.editorOptions) {
      this.editorOptions.modes = disabled ? ['view'] : ['tree', 'code']
      this.editorOptions.mode = disabled ? 'view' : 'tree'
    }
    super.setDisabled(disabled)
  }

  protected onEditorChange(value: unknown): void {
    // The native "change" events of the inputs of the editor (checkboxes, search box, text mode...) bubble up
    // to the host element: the (change) binding receives them too, besides the JSON emitted by the editor.
    if (value instanceof Event) {
      return
    }

    if (!isJsonObjectOrArray(value)) {
      // The text mode lets the user type any JSON value, but this input only accepts objects and arrays.
      return
    }

    if (this.isComponent() && isJsonObject(value) && !this.hasSameReadonlyFields(value)) {
      const restored = this.withReadonlyFields(value)
      this.editor.update(restored as unknown as JSON)
      this.dialogService.warning('Les champs « cid » et « selector » ne peuvent pas être modifiés.')
      this.lastValidValue = restored
      this.notifyValueChange?.(restored)
      return
    }

    this.lastValidValue = value
    this.notifyValueChange?.(value)
  }

  protected async pasteJson(): Promise<void> {
    const result = await readJsonFromClipboard({ allowArrays: true })
    if (result.status === 'denied') {
      this.editor.setMode('code')
      this.dialogService.info('Accès au presse-papier refusé : collez le JSON directement dans l’éditeur texte.')
      return
    }
    if (result.status === 'invalid') {
      this.dialogService.error(result.message)
      return
    }

    const { value } = result
    const newValue = this.isComponent() && isJsonObject(value) ? this.withReadonlyFields(value) : value

    // The replacement is recorded in the history of the tree mode so that it can be undone with Ctrl+Z.
    // It triggers the change event of the editor, which notifies the new value.
    switchJsonEditorToTreeMode(this.editor, this.lastValidValue ?? this.value)
    replaceJsonEditorValue(this.editor, newValue)
    this.editor.focus()

    if (result.repaired) {
      this.dialogService.warning(REPAIRED_JSON_MESSAGE)
    }
  }

  private isComponent(): boolean {
    return isJsonObject(this.value) && !!this.value['cid'] && !!this.value['selector']
  }

  private hasSameReadonlyFields(value: Record<string, unknown>): boolean {
    const current = this.value as Record<string, unknown> | undefined
    return READONLY_COMPONENT_FIELDS.every((field) => value[field] === current?.[field])
  }

  private withReadonlyFields(value: Record<string, unknown>): Record<string, unknown> {
    const current = this.value as Record<string, unknown> | undefined
    const readonly = Object.fromEntries(READONLY_COMPONENT_FIELDS.map((field) => [field, current?.[field]]))
    return { ...readonly, ...value, ...readonly }
  }
}

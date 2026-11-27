/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  inject,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { DialogService } from '@platon/core/browser'
import {
  REPAIRED_JSON_MESSAGE,
  readJsonFromClipboard,
  renderJsonEditorLineBreaks,
  replaceJsonEditorValue,
  switchJsonEditorToTreeMode,
} from '@platon/shared/ui'
import { isJsonObject } from '@platon/shared/utils'
import { JsonEditorComponent, JsonEditorOptions, JsonEditorTreeNode } from 'ang-jsoneditor'
import { firstValueFrom } from 'rxjs'
import { type WebComponentDefinition } from '../../web-component'

import { MatButtonModule } from '@angular/material/button'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { MatIconModule } from '@angular/material/icon'

/** Fields of a webcomponent state that must never be edited. */
const READONLY_FIELDS = ['cid', 'selector']

@Component({
  selector: 'wc-showcase',
  templateUrl: './showcase.component.html',
  styleUrls: ['./showcase.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButtonModule, NzTooltipModule, NgeMarkdownModule, JsonEditorComponent, MatIconModule],
})
export class ShowcaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef) as ElementRef<HTMLElement>
  private readonly resourceLoader = inject(ResourceLoaderService)
  private readonly dialogService = inject(DialogService)
  private resizeObserver?: ResizeObserver

  protected readonly options = new JsonEditorOptions()

  protected component?: any
  protected showEditor = false

  @ViewChild(JsonEditorComponent)
  protected readonly editor?: JsonEditorComponent

  @Input()
  definition!: WebComponentDefinition

  async ngOnInit() {
    await firstValueFrom(this.resourceLoader.loadAllAsync([['style', 'assets/vendors/jsoneditor/jsoneditor.min.css']]))
    const host = this.elementRef.nativeElement.firstElementChild
    this.component = document.createElement(this.definition.selector)

    const { showcase, schema } = this.definition
    if (showcase) {
      this.component.state = {
        ...showcase,
        ...Object.keys(this.definition.schema.properties)
          .filter((k) => {
            return !(k in showcase)
          })
          .reduce((rec, curr) => {
            if (!(curr in showcase)) rec[curr] = schema.properties[curr].default
            return rec
          }, {} as Record<string, any>),
      }
    }
    host?.appendChild(this.component)

    this.options.modes = ['tree', 'code']
    this.options.language = 'fr-FR'
    this.options.schema = schema
    this.options.mainMenuBar = true
    this.options.navigationBar = false
    this.options.statusBar = false
    this.options.enableSort = false
    this.options.enableTransform = false
    this.options.sortObjectKeys = false

    this.options.onEditable = (e) => {
      const node = e as JsonEditorTreeNode
      if (READONLY_FIELDS.includes(`${node.field}`)) return false
      return true
    }

    this.options.onBlur = () => renderJsonEditorLineBreaks(this.editor)
  }

  editorToComponent() {
    try {
      const state = this.editor?.get()
      if (!isJsonObject(state) || !this.component) return
      this.component.state = this.withReadonlyFields(state)
    } catch (error) {
      // The text mode may contain invalid JSON.
      this.dialogService.error("Le contenu de l'éditeur n'est pas un JSON valide.")
      console.error(error)
    }
  }

  async pasteJson() {
    if (!this.editor) return

    // The state of a component is always an object.
    const result = await readJsonFromClipboard({ allowArrays: false })
    if (result.status === 'denied') {
      this.editor.setMode('code')
      this.dialogService.info('Accès au presse-papier refusé : collez le JSON directement dans l’éditeur texte.')
      return
    }
    if (result.status === 'invalid') {
      this.dialogService.error(result.message)
      return
    }

    // The replacement is recorded in the history of the tree mode so that it can be undone with Ctrl+Z.
    switchJsonEditorToTreeMode(this.editor, this.component?.state ?? {})
    replaceJsonEditorValue(this.editor, this.withReadonlyFields(result.value as Record<string, any>))
    this.editorToComponent()
    this.editor.focus()

    if (result.repaired) {
      this.dialogService.warning(REPAIRED_JSON_MESSAGE)
    }
  }

  private withReadonlyFields(state: Record<string, any>): Record<string, any> {
    const current = this.component?.state ?? {}
    const readonly = Object.fromEntries(READONLY_FIELDS.filter((f) => f in current).map((f) => [f, current[f]]))
    return { ...readonly, ...state, ...readonly }
  }

  componentToEditor() {
    this.editor?.set(this.component.state)
  }

  ngAfterViewInit() {
    const sendHeight = () => {
      const height = this.elementRef.nativeElement.clientHeight + 20
      window.parent.postMessage({ type: 'resize', height }, '*')
    }

    this.resizeObserver = new ResizeObserver(() => {
      sendHeight()
    })

    this.resizeObserver.observe(this.elementRef.nativeElement)
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect()
  }
}

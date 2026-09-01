// tslint:disable: no-bitwise

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  DOCUMENT,
  inject,
} from '@angular/core'

import { ACTION_GOTO_LINE, ACTION_INDENT_USING_SPACES, ACTION_QUICK_COMMAND } from '@cisstech/nge/monaco'
import { NO_COPY_PASTER_CLASS_NAME } from '@platon/feature/player/common'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import { WebComponentService } from '../../web-component.service'
import { CodeEditorComponentDefinition, type CodeEditorState } from './code-editor'
import { BaseModule } from '../../shared/components/base/base.module'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { NgeMonacoModule } from '@cisstech/nge/monaco'

const MIN_EDITOR_HEIGHT_PX = 400

@Component({
  selector: 'wc-code-editor',
  templateUrl: 'code-editor.component.html',
  styleUrls: ['code-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, NzTooltipModule, NgeMonacoModule],
})
@WebComponent(CodeEditorComponentDefinition)
export class CodeEditorComponent implements OnInit, AfterViewInit, OnDestroy, WebComponentHooks<CodeEditorState> {
  readonly injector = inject(Injector)
  readonly changeDetector = inject(WebComponentChangeDetectorService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly renderer = inject(Renderer2)
  private readonly document = inject<Document>(DOCUMENT)
  private readonly webComponentService = inject(WebComponentService)

  private readonly disposables: monaco.IDisposable[] = []
  private model?: monaco.editor.ITextModel
  private editor?: monaco.editor.IStandaloneCodeEditor
  private resizeObserver?: ResizeObserver

  @Input() state!: CodeEditorState
  @Output() stateChange = new EventEmitter<CodeEditorState>()

  @ViewChild('resizableEl', { static: true })
  resizableEl!: ElementRef<HTMLElement>

  initialCode = ''
  cursor: monaco.IPosition = {
    column: 0,
    lineNumber: 0,
  }

  isResizing = false
  private resizeStartY = 0
  private resizeStartHeight = 0
  private savedBodyOverflow = ''
  private capturedPointerId: number | null = null
  private capturingElement: HTMLElement | null = null
  private unlistenPointerUp?: () => void
  private unlistenPointerCancel?: () => void
  private unlistenLostPointerCapture?: () => void
  private unlistenWindowResize?: () => void
  private rafId?: number
  private pendingClientY?: number

  ngAfterViewInit() {
    const onResize = () => {
      if (!this.isResizing) {
        this.editor?.layout()
      }
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(onResize)
      this.resizeObserver.observe(this.resizableEl.nativeElement)
    } else {
      this.unlistenWindowResize = this.renderer.listen('window', 'resize', onResize)
    }
  }

  ngOnInit() {
    this.state.isFilled = false
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect()
    this.unlistenWindowResize?.()
    this.cleanupResize()
    this.disposables.forEach((d) => d.dispose())
  }

  onResizeStart(event: PointerEvent) {
    if (this.isResizing) return
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    this.capturedPointerId = event.pointerId
    this.capturingElement = target
    this.isResizing = true
    this.resizeStartY = event.clientY
    this.resizeStartHeight = this.resizableEl.nativeElement.getBoundingClientRect().height
    this.savedBodyOverflow = this.document.body.style.overflow
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden')
    this.renderer.setStyle(this.document.documentElement, 'overflow', 'hidden')
    this.renderer.setStyle(this.document.body, 'cursor', 'ns-resize')
    // Filets de sécurité : garantissent le nettoyage même si les événements ne remontent pas jusqu'au grip
    this.unlistenLostPointerCapture = this.renderer.listen(target, 'lostpointercapture', this.cleanupResize)
    this.unlistenPointerUp = this.renderer.listen(this.document, 'pointerup', this.cleanupResize)
    this.unlistenPointerCancel = this.renderer.listen(this.document, 'pointercancel', this.cleanupResize)
  }

  onResizeMove(event: PointerEvent) {
    if (!this.isResizing) return
    event.preventDefault()
    this.pendingClientY = event.clientY
    if (this.rafId === undefined) {
      this.rafId = this.document.defaultView?.requestAnimationFrame(() => {
        this.rafId = undefined
        const clientY = this.pendingClientY
        this.pendingClientY = undefined
        if (clientY === undefined) return
        const newHeight = Math.max(MIN_EDITOR_HEIGHT_PX, this.resizeStartHeight + (clientY - this.resizeStartY))
        this.changeDetector
          .ignore(this, () => {
            this.state.height = newHeight
          })
          .catch(console.error)
      })
    }
  }

  onResizeEnd(_event: PointerEvent) {
    this.cleanupResize()
  }

  private readonly cleanupResize = () => {
    if (this.rafId !== undefined) {
      this.document.defaultView?.cancelAnimationFrame(this.rafId)
      this.rafId = undefined
      this.pendingClientY = undefined
    }
    this.isResizing = false
    if (this.capturedPointerId !== null && this.capturingElement?.hasPointerCapture(this.capturedPointerId)) {
      this.capturingElement.releasePointerCapture(this.capturedPointerId)
    }
    this.unlistenLostPointerCapture?.()
    this.unlistenLostPointerCapture = undefined
    this.capturedPointerId = null
    this.capturingElement = null
    this.unlistenPointerUp?.()
    this.unlistenPointerCancel?.()
    this.unlistenPointerUp = undefined
    this.unlistenPointerCancel = undefined
    if (this.savedBodyOverflow) {
      this.renderer.setStyle(this.document.body, 'overflow', this.savedBodyOverflow)
    } else {
      this.renderer.removeStyle(this.document.body, 'overflow')
    }
    this.renderer.removeStyle(this.document.documentElement, 'overflow')
    this.renderer.removeStyle(this.document.body, 'cursor')
    this.editor?.layout()
    this.cdr.markForCheck()
  }

  onCreateEditor(editor: monaco.editor.IEditor) {
    const standaloneEditor = editor as monaco.editor.IStandaloneCodeEditor
    this.editor = standaloneEditor

    standaloneEditor.setModel(
      (this.model = this.model || monaco.editor.createModel(this.state.code || '', this.state.language || 'plaintext'))
    )

    // OPTIONS
    this.detectOptionsChange()
    this.model.updateOptions({
      tabSize: this.state.tabSize,
      insertSpaces: true,
      trimAutoWhitespace: true,
    })

    standaloneEditor.updateOptions({
      autoIndent: 'advanced',
      lineNumbers: 'on',
      renderWhitespace: 'all',
      quickSuggestions: true,
      glyphMargin: false,
      renderControlCharacters: true,
      contextmenu: this.document.querySelector(`.${NO_COPY_PASTER_CLASS_NAME}`) == null,
      minimap: {
        enabled: true,
      },
      scrollbar: {
        verticalScrollbarSize: 4,
        verticalSliderSize: 4,
      },
    })

    // LISTENERS
    this.disposables.push(this.model)
    this.disposables.push(standaloneEditor)
    this.disposables.push(
      this.model.onDidChangeContent(() => {
        this.changeDetector
          .ignore(this, () => {
            this.state.code = this.model?.getValue() || ''
            this.state.isFilled = this.state.code !== this.initialCode
          })
          .catch(console.error)
      })
    )
    this.disposables.push(
      standaloneEditor.onDidChangeCursorPosition((e) => {
        this.changeDetector
          .ignore(this, () => {
            this.cursor = e.position
          })
          .catch(console.error)
      })
    )

    // COMMANDS
    standaloneEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        //
      },
      ''
    )

    standaloneEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      this.webComponentService.submit(this)
    })

    this.initialCode = this.state.code
  }

  onChangeState() {
    if (!this.model) return

    monaco.editor.setModelLanguage(this.model, this.state.language || 'plaintext')

    this.editor?.updateOptions({
      tabSize: this.state.tabSize,
      quickSuggestions: this.state.quickSuggestions,
    })
    if (this.model.getValue() !== this.state.code) {
      this.model.setValue(this.state.code)
    }
  }

  reset() {
    this.state.code = this.initialCode
    this.onChangeState()
  }

  goToLine() {
    if (!this.editor) return
    const action = this.editor.getAction(ACTION_GOTO_LINE)
    this.editor.focus()
    action?.run().catch(console.error)
  }

  quickCommand() {
    if (!this.editor) return
    const action = this.editor.getAction(ACTION_QUICK_COMMAND)
    this.editor.focus()
    action?.run().catch(console.error)
  }

  changeIndent() {
    if (!this.editor) return
    const action = this.editor.getAction(ACTION_INDENT_USING_SPACES)
    this.editor.focus()
    action?.run().catch(console.error)
  }

  private detectOptionsChange() {
    if (!this.model) return

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const updateOptions = this.model.updateOptions
    this.model.updateOptions = function (
      this: monaco.editor.ITextModel,
      options: monaco.editor.ITextModelUpdateOptions
    ) {
      updateOptions.apply(this, [options])
      if (options.tabSize) {
        that.changeDetector
          .ignore(that, () => {
            that.state.tabSize = options.tabSize || that.state.tabSize
          })
          .catch(console.error)
      }
    }
  }
}

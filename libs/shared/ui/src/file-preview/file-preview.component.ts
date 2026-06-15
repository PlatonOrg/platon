/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

import * as Papa from 'papaparse'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'

import { NzInputNumberModule } from 'ng-zorro-antd/input-number'

import { FormsModule } from '@angular/forms'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_TEXT_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
  extractSupportedExtension,
} from './file-preview'
import { NzInputModule } from 'ng-zorro-antd/input'
import { JsonSyntaxHighlightPipe } from './file-preview-Json-Highlight.pipe'

import { EditFilePreviewService } from './file-preview-edition-service'
import { NgeMonacoModule } from '@cisstech/nge/monaco'
import { NzTableModule } from 'ng-zorro-antd/table'

if (typeof window !== 'undefined') {
  // for nge-editor lang, add coloration for the editor
  window.MonacoEnvironment = {
    getWorkerUrl: function () {
      return '/assets/vendors/nge/monaco/min/vs/base/worker/workerMain.js'
    },
  }
}

@Component({
  standalone: true,
  selector: 'ui-file-preview',
  templateUrl: 'file-preview.component.html',
  styleUrl: 'file-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzInputNumberModule,
    NgeMarkdownModule,
    JsonSyntaxHighlightPipe,
    NgeMonacoModule,
    NzTableModule,
  ],
})
export class UiFilePreviewComponent implements OnChanges, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  @Input({ required: true }) src!: string

  public readonly editService = inject(EditFilePreviewService)

  @ViewChild('pdfCanvas', { static: false, read: ElementRef })
  pdfCanvas?: ElementRef<HTMLCanvasElement> | undefined
  protected isImage = false
  protected isVideo = false
  protected isText = false
  protected isPdf = false
  protected isCsv = false
  protected isJson = false
  protected isMd = false // separate .md from txt in order to don't have the md interpretation
  protected unsupported = false
  protected pdfDocument: any
  protected currentPage = 1
  protected totalPages = 0
  protected scale = 1.0

  // JSON and CSV
  protected dataValid = true // false when extracting value from file fail (JSON, CVS, ...)
  protected message = '' // store error information
  // CSV
  protected csvHeaders: string[] = []
  protected csvRows: any[] = []

  protected isLoading = false
  private updated = false
  private localEditor?: monaco.editor.IStandaloneCodeEditor // help refresh the vue
  @Output() saveCmd = new EventEmitter<void>() // ctrl-s on the editor

  constructor() {
    effect(
      () => {
        // update for when go from editor to vue
        if (!this.src || this.editService.isEditing()) {
          return
        }
        const currentData = this.editService.getCurrentFileContent(this.src)
        const _ = this.editService.refreshRequest()
        if (this.isCsv) {
          this.parseCsvForPreview(currentData)
        }
        this.changeDetectorRef.markForCheck()
      },
      { allowSignalWrites: true }
    )
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['src'] || this.updated) {
      this.updateDisplayType()
      if (this.isPdf) {
        setTimeout(() => this.loadPDF(), 0) // wait for pdfCanvas to be defined
      }
      if (this.isText || this.isCsv || this.isJson) {
        await this.loadTextContent()
      }
      if (this.isCsv && !this.editService.isEditing()) {
        this.parseCsvForPreview(this.editService.data(this.src))
      }
      this.updated = false
    }
  }

  /** clear the local editor when clossing the preview */
  ngOnDestroy() {
    if (this.localEditor) {
      this.localEditor.setModel(null)
      this.localEditor.dispose()
      this.localEditor = undefined
    }
  }

  /** create the editor or use the existing one */
  onCreateEditor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.updated = true
    this.localEditor = editor
    const model = this.editService.getModel(this.src)
    if (!model) {
      const lang = this.isJson ? 'json' : this.isCsv ? 'csv' : 'plaintext'
      this.editService.createModel(this.src, lang)
    }
    this.localEditor.updateOptions({
      scrollBeyondLastLine: false, // no empty space at the end
      automaticLayout: true, // check container size change
      minimap: { enabled: false },
      // reduce working load in order to close more easily
      occurrencesHighlight: 'off',
      selectionHighlight: false,
      renderLineHighlight: 'none',
    })
    this.localEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveCmd.emit()
    })
    this.syncModel()
  }

  /** synchronized the local editor and the service one */
  private syncModel() {
    const model = this.editService.getModel(this.src)
    if (!this.localEditor || !model) {
      console.warn('Erreur Synchronisation éditeur ou Modèle non prêt')
      return
    }
    this.localEditor.setModel(model)
    setTimeout(() => {
      if (this.localEditor) {
        this.localEditor.layout()
        this.localEditor.revealLine(1)
      }
    }, 100) // delay to insure the models are synch before refresch
  }

  /** load text (txt, json, csv,) document */
  private async loadTextContent() {
    this.isLoading = true
    this.dataValid = true
    if (this.editService.isEditing()) {
      if (this.isCsv) {
        this.parseCsvForPreview(this.editService.data(this.src))
      }
      return // not in editing
    }
    const model = this.editService.getModel(this.src)
    if (!model) {
      // editor model already created, so use it's value
      const response = await fetch(this.src, { cache: 'no-store' })
      if (!response.ok) {
        this.dataValid = false
        this.message = response.statusText
        this.changeDetectorRef.markForCheck()
        this.isLoading = false
        return
      }
      const content = await response.text()
      this.editService.setCurrentContent(this.src, content)
    }
    if (this.isCsv) {
      this.parseCsvForPreview(this.editService.data(this.src))
    }
    this.changeDetectorRef.detectChanges()
  }

  protected onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.renderPage(this.currentPage)
    }
  }

  protected onPrevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--
      this.renderPage(this.currentPage)
    }
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
      this.renderPage(this.currentPage)
    }
  }

  protected zoomIn(): void {
    this.scale *= 1.1
    this.renderPage(this.currentPage)
  }

  protected zoomOut(): void {
    if (this.scale > 0.5) {
      // Prevent too much zoom out
      this.scale *= 0.9
      this.renderPage(this.currentPage)
    }
  }

  private updateDisplayType(): void {
    const extension = extractSupportedExtension(this.src)
    if (!extension) {
      this.unsupported = true
      return
    }
    this.isImage = SUPPORTED_IMAGE_EXTENSIONS.includes(extension)
    this.isVideo = SUPPORTED_VIDEO_EXTENSIONS.includes(extension)
    this.isMd = extension === 'md'
    this.isText = SUPPORTED_TEXT_EXTENSIONS.includes(extension)
    this.isPdf = extension === 'pdf'
    this.isCsv = extension === 'csv'
    this.isJson = extension === 'json'
  }

  // PDF
  private loadPDF(): void {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
    const loadingTask = pdfjsLib.getDocument(this.src)
    loadingTask.promise.then((pdf: any) => {
      this.pdfDocument = pdf
      this.totalPages = pdf.numPages
      this.renderPage(this.currentPage)
      this.changeDetectorRef.detectChanges()
    })
  }

  private renderPage(pageNumber: number): void {
    this.pdfDocument.getPage(pageNumber).then((page: any) => {
      const canvas = this.pdfCanvas?.nativeElement as HTMLCanvasElement
      const context = canvas.getContext('2d')
      const viewport = page.getViewport({ scale: this.scale })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }
      page.render(renderContext)
    })
  }

  /** separate cell for the csv.  */
  private parseCsvForPreview(csv: string): void {
    Papa.parse(csv, {
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const data = result.data as string[][]
        if (data.length === 0) {
          return // empty file
        }
        this.csvHeaders = data[0]
        this.csvRows = data.slice(1)
        const maxSize = Math.max(...data.map((row) => row.length))
        while (this.csvHeaders.length < maxSize) {
          this.csvHeaders.push(' ')
        }
        this.changeDetectorRef.markForCheck()
      },
    })
  }
}

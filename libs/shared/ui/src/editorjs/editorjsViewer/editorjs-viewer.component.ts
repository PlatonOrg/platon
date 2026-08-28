import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { OutputData } from '@editorjs/editorjs'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { EditorjsViewerService } from '@platon/shared/utils'
import { take } from 'rxjs'
import { isExercisePreviewResizeMessage } from '../exercise-preview-resize'

@Component({
  standalone: true,
  selector: 'ui-editorjs-viewer',
  templateUrl: './editorjs-viewer.component.html',
  styleUrls: ['./editorjs-viewer.component.scss'],
  providers: [EditorjsViewerService],
})
export class EditorjsViewerComponent implements OnChanges, OnDestroy {
  @Input() data: OutputData | undefined
  protected sanitizedHtml: SafeHtml = ''

  private readonly resourceLoader = inject(ResourceLoaderService)
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)
  private hljsStyleLoaded = false
  private readonly resizeListener = (event: MessageEvent) => this.onResizeMessage(event)

  constructor(private editorjsViewerService: EditorjsViewerService, private readonly sanitizer: DomSanitizer) {
    window.addEventListener('message', this.resizeListener)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      if (!this.hljsStyleLoaded && this.editorjsViewerService.hasCodeBlock(this.data)) {
        this.hljsStyleLoaded = true
        this.resourceLoader
          .loadAllAsync([['style', 'assets/vendors/highlight.js/styles/github.css']])
          .pipe(take(1))
          .subscribe()
      }
      const newData = this.editorjsViewerService.editorJStoHtml(this.data)
      this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(newData)
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.resizeListener)
  }

  private onResizeMessage(event: MessageEvent): void {
    if (event.origin !== window.location.origin || !isExercisePreviewResizeMessage(event.data)) {
      return
    }

    const frames = this.elementRef.nativeElement.querySelectorAll<HTMLIFrameElement>('.exercise-frame')
    frames.forEach((frame) => {
      if (event.source === frame.contentWindow) {
        frame.style.height = `${event.data.height}px`
      }
    })
  }
}

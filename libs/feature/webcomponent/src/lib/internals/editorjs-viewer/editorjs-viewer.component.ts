import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  SecurityContext,
} from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { EditorjsViewerService } from '@platon/shared/utils'

@Component({
  selector: 'wc-editorjs-viewer',
  templateUrl: './editorjs-viewer.component.html',
  styleUrls: ['./editorjs-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorjsViewerComponent implements OnInit {
  protected sanitizedHtml: SafeHtml = ''

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly editorjsViewerService: EditorjsViewerService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.elementRef.nativeElement.getAttribute('id')
    const scriptNode = document.querySelector(`script[id="${id}"]`) as HTMLScriptElement
    try {
      const content = scriptNode.textContent?.trim() || '{}'
      const data = JSON.parse(content)
      const htmlContent = this.editorjsViewerService.editorJStoHtml(data)

      // Nettoyer le HTML pour éliminer les scripts malveillants
      this.sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, htmlContent) || ''

      this.changeDetectorRef.detectChanges()
    } catch (error) {
      console.warn('Error parsing Editor.js output:', error)
      this.sanitizedHtml = ''
    }
  }
}

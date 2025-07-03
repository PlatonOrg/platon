import { Component, Input, SimpleChanges, OnChanges, SecurityContext, ChangeDetectorRef } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { OutputData } from '@editorjs/editorjs'
import { EditorjsViewerService } from '@platon/shared/utils'

@Component({
  standalone: true,
  selector: 'ui-editorjs-viewer',
  templateUrl: './editorjs-viewer.component.html',
  styleUrls: ['./editorjs-viewer.component.scss'],
  providers: [EditorjsViewerService],
})
export class EditorjsViewerComponent implements OnChanges {
  @Input() data: OutputData | undefined
  protected sanitizedHtml: SafeHtml = ''

  constructor(
    private editorjsViewerService: EditorjsViewerService,
    private readonly sanitizer: DomSanitizer,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data && this.data) {
      const newData = this.editorjsViewerService.editorJStoHtml(this.data)
      this.sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, newData) || ''
    }
  }
}

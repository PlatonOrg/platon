import { Component, Input, SimpleChanges, OnChanges, inject } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { OutputData } from '@editorjs/editorjs'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { EditorjsViewerService } from '@platon/shared/utils'
import { take } from 'rxjs'

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

  private readonly resourceLoader = inject(ResourceLoaderService)
  private hljsStyleLoaded = false

  constructor(private editorjsViewerService: EditorjsViewerService, private readonly sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      if (!this.hljsStyleLoaded && this.editorjsViewerService.hasCodeBlock(this.data)) {
        this.hljsStyleLoaded = true
        this.resourceLoader
          .loadAllAsync([['style', 'assets/vendors/highlight.js/styles/github.css']])
          .pipe(take(1))
          .subscribe()
      }
      console.log('EditorjsViewerComponent: data changed, updating HTML', this.data)
      const newData = this.editorjsViewerService.editorJStoHtml(this.data)
      console.log('Generated HTML:', newData)

      this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(newData)
    }
  }
}

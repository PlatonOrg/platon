import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, inject } from '@angular/core'
import { OutputData } from '@editorjs/editorjs'
import { EditorjsViewerComponent as UiEditorjsViewerComponent } from '@platon/shared/ui'

@Component({
  selector: 'wc-editorjs-viewer',
  templateUrl: './editorjs-viewer.component.html',
  styleUrls: ['./editorjs-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiEditorjsViewerComponent],
})
export class EditorjsViewerComponent implements OnInit {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)

  protected data?: OutputData

  ngOnInit(): void {
    const id = this.elementRef.nativeElement.getAttribute('id')
    const scriptNode = document.querySelector(`script[id="${id}"]`) as HTMLScriptElement
    try {
      const content = scriptNode.textContent?.trim() || '{}'
      this.data = JSON.parse(content)
      this.changeDetectorRef.detectChanges()
    } catch (error) {
      console.warn('Error parsing Editor.js output:', error)
    }
  }
}

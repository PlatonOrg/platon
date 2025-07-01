import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core'
import { OutputData } from '@editorjs/editorjs'

@Component({
  selector: 'wc-editorjs-viewer',
  templateUrl: './editorjs-viewer.component.html',
  styleUrls: ['./editorjs-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorjsViewerComponent implements OnInit {
  protected data?: OutputData

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {}

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

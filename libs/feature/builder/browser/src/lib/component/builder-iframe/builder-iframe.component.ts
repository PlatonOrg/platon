import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, Input, ViewChild } from '@angular/core'

@Component({
  standalone: true,
  selector: 'lib-builder-iframe',
  templateUrl: './builder-iframe.component.html',
  styleUrls: ['./builder-iframe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class BuilderIFrameComponent implements AfterViewInit {
  @ViewChild('iframeEl') private iframeEl!: ElementRef<HTMLIFrameElement>

  readonly width = input<string>('100%')
  readonly height = input<string>('100%')

  private _src?: string
  private viewInitialized = false

  @Input()
  set src(value: string | undefined) {
    this._src = value
    if (this.viewInitialized) {
      this.navigate(value)
    }
  }

  get src(): string | undefined {
    return this._src
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true
    if (this._src) {
      this.navigate(this._src)
    }
  }

  private navigate(url?: string): void {
    const iframe = this.iframeEl?.nativeElement
    if (!iframe || !url) return
    iframe.contentWindow?.location.replace(url)
  }
}

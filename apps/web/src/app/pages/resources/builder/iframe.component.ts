import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core'
import { SafePipe } from '@cisstech/nge/pipes'

@Component({
  standalone: true,
  selector: 'app-ui-iframe',
  template: `
    <div class="ui-iframe-container" *ngIf="url">
      <iframe [src]="url | safe : 'resource'" frameborder="0"></iframe>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .ui-iframe-container {
        width: 100%;
        height: 100%;
        position: relative;
      }

      iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SafePipe],
})
export class UiIFrameComponent implements OnInit, OnDestroy {
  protected url?: string

  @Input() width?: string | null = '100%'
  @Input() height?: string | null = '100%'

  private _src?: string

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  @Input()
  set src(value: string | undefined) {
    this._src = value
    if (value) {
      this.url = value
      this.changeDetectorRef.markForCheck()
    }
  }

  get src(): string | undefined {
    return this._src
  }

  ngOnInit(): void {
    if (this._src) {
      this.url = this._src
      this.changeDetectorRef.markForCheck()
    }
  }

  ngOnDestroy(): void {
    this.url = undefined
  }
}

import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core'
import { SafePipe } from '@cisstech/nge/pipes'

@Component({
  standalone: true,
  selector: 'app-builder-iframe',
  templateUrl: './builder-iframe.component.html',
  styleUrls: ['./builder-iframe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SafePipe],
})
export class BuilderIFrameComponent {
  @Input() width?: string | null = '100%'
  @Input() height?: string | null = '100%'

  private _src?: string

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  @Input()
  set src(value: string | undefined) {
    this._src = value
    this.changeDetectorRef.markForCheck()
  }

  get src(): string | undefined {
    return this._src
  }
}

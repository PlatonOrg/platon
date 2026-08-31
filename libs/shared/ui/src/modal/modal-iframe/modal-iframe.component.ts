import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  booleanAttribute,
  inject,
} from '@angular/core'
import { SafePipe } from '@cisstech/nge/pipes'
import { NzModalModule } from 'ng-zorro-antd/modal'

export const UI_MODAL_IFRAME_CLOSE = 'UI_MODAL_IFRAME_CLOSE'

@Component({
  selector: 'ui-modal-iframe',
  templateUrl: './modal-iframe.component.html',
  styleUrls: ['./modal-iframe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzModalModule, SafePipe],
})
export class UiModalIFrameComponent implements OnInit, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected url?: string
  protected visible = false

  @Input() width?: string | null = '90vw'
  @Input() height?: string | null = '90vh'

  @Input({ transform: booleanAttribute }) closable = false
  @Input({ transform: booleanAttribute }) maskClosable = true
  @Input() footer?: TemplateRef<void> | null

  @Output() closed = new EventEmitter()
  @Output() canceled = new EventEmitter()
  @Output() accepted = new EventEmitter()

  ngOnInit(): void {
    window.addEventListener('message', this.onMessage.bind(this))
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage.bind(this))
  }

  open(url: string): void {
    this.url = url
    this.visible = true
    this.changeDetectorRef.markForCheck()
  }

  protected close(accepted = false): void {
    this.visible = false
    if (accepted) {
      this.accepted.emit()
    } else {
      this.canceled.emit()
    }
    this.closed.emit()
    this.changeDetectorRef.markForCheck()
  }

  private onMessage(event: MessageEvent): void {
    if (event.data === UI_MODAL_IFRAME_CLOSE && this.visible) {
      this.close()
    }
  }
}

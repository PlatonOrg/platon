import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { ClipboardService } from '@cisstech/nge/services'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzMessageService } from 'ng-zorro-antd/message'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { UiModalTemplateComponent } from '../../modal/modal-template/modal-template.component'
import { UiQRCodeComponent } from '../qrcode.component'

@Component({
  selector: 'ui-qrcode-modal',
  templateUrl: './qrcode-modal.component.html',
  styleUrls: ['./qrcode-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzButtonModule, NzIconModule, NzToolTipModule, UiModalTemplateComponent, UiQRCodeComponent],
})
export class UiQRCodeModalComponent {
  private readonly clipboardService = inject(ClipboardService)
  private readonly messageService = inject(NzMessageService)
  private readonly destroyRef = inject(DestroyRef)
  private frameId = 0
  private readonly modal = viewChild.required<UiModalTemplateComponent>('modal')

  readonly url = input.required<string>()
  readonly title = input('QR Code')

  protected readonly isFullscreen = signal(false)
  protected readonly qrSize = signal(0)

  // ui-modal-template freezes `width` into the body style on open; override it so the body follows the modal on resize
  protected readonly bodyStyle = { width: 'auto' }

  protected get modalWidth(): string {
    return `min(${this.windowedQrSize() + 100}px, calc(100vw - 32px))`
  }

  open(): void {
    this.qrSize.set(this.windowedQrSize())
    this.modal().open()
  }

  constructor() {
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.frameId))
  }

  // 'fullscreenchange' fires before the viewport is resized, so also listen to 'resize'
  @HostListener('document:fullscreenchange')
  @HostListener('window:resize')
  protected onViewportChange(): void {
    if (this.qrSize() === 0) return
    // Batch bursts of resize events into a single update per frame
    cancelAnimationFrame(this.frameId)
    this.frameId = requestAnimationFrame(() => this.updateSize())
  }

  private updateSize(): void {
    const fullscreen = !!document.fullscreenElement
    this.isFullscreen.set(fullscreen)
    this.qrSize.set(
      fullscreen ? Math.floor(Math.min(window.innerWidth, window.innerHeight - 100) * 0.9) : this.windowedQrSize()
    )
  }

  protected async toggleFullscreen(element: HTMLElement): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await element.requestFullscreen()
      }
    } catch {
      this.messageService.error('Impossible de changer le mode plein écran')
    }
  }

  protected exitFullscreen(): void {
    // Closing the modal must not fail loudly if fullscreen was already exited
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
    }
  }

  protected copyUrl(): void {
    this.clipboardService
      .copy(this.url())
      .then(() => this.messageService.success('Lien copié dans le presse-papier'))
      .catch(() => this.messageService.error('Impossible de copier le lien dans le presse-papier'))
  }

  private windowedQrSize(): number {
    // 32px modal margins + 48px body padding + 4px safety on narrow screens
    const maxWidth = window.innerWidth - 84
    return Math.floor(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.6, maxWidth))
  }
}

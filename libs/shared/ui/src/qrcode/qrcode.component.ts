import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core'
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code'

@Component({
  selector: 'ui-qrcode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // None: nz-qrcode renders its canvas in its own view, which scoped styles cannot reach
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      ui-qrcode {
        display: block;
        width: fit-content;
      }

      .ui-qrcode {
        position: relative;
        display: block;
      }

      .ui-qrcode canvas {
        image-rendering: pixelated;
      }

      .ui-qrcode-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1%;
        border-radius: 8%;
        box-sizing: content-box;
      }

      .ui-qrcode-icon img {
        width: 100%;
        height: 100%;
      }
    `,
  ],
  imports: [NzQRCodeModule],
  template: `
    <div class="ui-qrcode">
      <nz-qrcode [nzSize]="size()" [nzValue]="value()" [nzColor]="color() || qrCodeColor" [nzBgColor]="bg"></nz-qrcode>
      @if (icon()) {
      <span
        class="ui-qrcode-icon"
        [style.background]="bg"
        [style.width.px]="size() * 0.2"
        [style.height.px]="size() * 0.2"
      >
        <img [src]="icon()" alt="" />
      </span>
      }
    </div>
  `,
})
export class UiQRCodeComponent {
  icon = input<string>('assets/images/logo/platon.svg')
  size = input<number>(128)
  value = input<string>('')
  backgroundColor = input<string | undefined>(undefined)
  color = input<string | undefined>(undefined)

  protected get bg(): string {
    return this.backgroundColor() || this.qrCodeBgColor
  }

  protected get qrCodeColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--brand-color-primary')?.trim() || '#DD3533'
  }

  protected get qrCodeBgColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--brand-background-components')?.trim() || '#FFFFFF'
  }
}

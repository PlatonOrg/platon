import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code'

@Component({
  standalone: true,
  selector: 'ui-qrcode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzQRCodeModule],
  template: `
    <nz-qrcode
      [nzValue]="value"
      [nzIcon]="icon"
      [nzColor]="color || qrCodeColor"
      [nzBgColor]="backgroundColor || qrCodeBgColor"
    ></nz-qrcode>
  `,
})
export class UiQRCodeComponent {
  @Input() icon = 'assets/images/logo/platon.svg'
  @Input() value = ''
  @Input() backgroundColor?: string
  @Input() color?: string

  protected get qrCodeColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--brand-color-primary')?.trim() || '#DD3533'
  }

  protected get qrCodeBgColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--brand-background-components')?.trim() || '#FFFFFF'
  }
}

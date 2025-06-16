import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Subscription } from 'rxjs'
import { ThemeService } from '../services/theme.service'

@Component({
  standalone: true,
  selector: 'core-theme-aware-icon',
  template: `<img [src]="currentSrc" [alt]="alt" [style.width]="size" [style.height]="size" />`,
  styleUrls: ['./theme-aware-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ThemeAwareIconComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService)
  private subscription?: Subscription

  @Input() basePath!: string
  @Input() darkSuffix = '-dark'
  @Input() alt = ''
  @Input() size = '24px'

  currentSrc = ''

  ngOnInit(): void {
    this.updateSrc()
    this.subscription = this.themeService.themeChange.subscribe(() => {
      this.updateSrc()
    })
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }

  private updateSrc(): void {
    if (this.themeService.isDark) {
      const lastDotIndex = this.basePath.lastIndexOf('.')
      if (lastDotIndex !== -1) {
        const pathWithoutExt = this.basePath.substring(0, lastDotIndex)
        const extension = this.basePath.substring(lastDotIndex)
        this.currentSrc = `${pathWithoutExt}${this.darkSuffix}${extension}`
      } else {
        this.currentSrc = `${this.basePath}${this.darkSuffix}`
      }
    } else {
      this.currentSrc = this.basePath
    }
  }
}

import { Directive, Input, OnInit, OnDestroy, ElementRef, Renderer2, inject } from '@angular/core'
import { Subscription } from 'rxjs'
import { ThemeService } from '../services/theme.service'

@Directive({
  standalone: true,
  selector: 'ui-icon[coreThemeAware]',
})
export class ThemeAwareIconDirective implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService)
  private readonly elementRef = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private subscription?: Subscription

  @Input() basePath!: string
  @Input() darkSuffix = '-dark'

  private originalIcon: { src: string } | undefined

  ngOnInit(): void {
    // Store the original icon
    const iconComponent = this.elementRef.nativeElement
    if (iconComponent && iconComponent.icon) {
      this.originalIcon = iconComponent.icon
      this.updateIcon()

      // Subscribe to theme changes
      this.subscription = this.themeService.themeChange.subscribe(() => {
        this.updateIcon()
      })
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }

  private updateIcon(): void {
    const iconComponent = this.elementRef.nativeElement
    if (!iconComponent || !this.originalIcon) return

    const isDark = this.themeService.isDark

    // Clone the original icon and modify the path for dark mode
    if (this.originalIcon.src) {
      const newSrc = isDark ? this.getDarkPath(this.originalIcon.src) : this.originalIcon.src
      iconComponent.icon = { ...this.originalIcon, src: newSrc }
    }
  }

  private getDarkPath(originalPath: string): string {
    const lastDotIndex = originalPath.lastIndexOf('.')
    if (lastDotIndex !== -1) {
      const pathWithoutExt = originalPath.substring(0, lastDotIndex)
      const extension = originalPath.substring(lastDotIndex)
      return `${pathWithoutExt}${this.darkSuffix}${extension}`
    }
    return `${originalPath}${this.darkSuffix}`
  }
}

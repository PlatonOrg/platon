import { Injectable, inject } from '@angular/core'
import { Icon } from '@cisstech/nge/ui/icon'
import { Observable, map } from 'rxjs'
import { ThemeService } from '../services/theme.service'

/**
 * An icon that automatically adapts its source based on the current theme.
 * When dark mode is active, it will append '-dark' to the filename before the extension.
 */
export class ThemeAwareImgIcon implements Icon {
  constructor(private basePath: string, private themeService: ThemeService, private darkSuffix = '-dark') {}

  get type() {
    return 'img' as const
  }

  get src(): string {
    // Return the current icon based on theme
    if (this.themeService.isDark) {
      const lastDotIndex = this.basePath.lastIndexOf('.')
      if (lastDotIndex !== -1) {
        const pathWithoutExt = this.basePath.substring(0, lastDotIndex)
        const extension = this.basePath.substring(lastDotIndex)
        return `${pathWithoutExt}${this.darkSuffix}${extension}`
      }
      return `${this.basePath}${this.darkSuffix}`
    }
    return this.basePath
  }

  /**
   * Get an observable that emits the icon path when theme changes
   */
  get srcObservable(): Observable<string> {
    return this.themeService.themeChange.pipe(
      map((theme) => {
        if (theme === 'dark') {
          const lastDotIndex = this.basePath.lastIndexOf('.')
          if (lastDotIndex !== -1) {
            const pathWithoutExt = this.basePath.substring(0, lastDotIndex)
            const extension = this.basePath.substring(lastDotIndex)
            return `${pathWithoutExt}${this.darkSuffix}${extension}`
          }
          return `${this.basePath}${this.darkSuffix}`
        }
        return this.basePath
      })
    )
  }
}

/**
 * Service to create theme-aware icons easily
 */
@Injectable({ providedIn: 'root' })
export class ThemeAwareIconService {
  private readonly themeService = inject(ThemeService)

  /**
   * Creates a theme-aware image icon
   * @param basePath Base path to the icon (light version)
   * @param darkSuffix Suffix to append for dark version (default: '-dark')
   * @returns ThemeAwareImgIcon instance
   */
  createIcon(basePath: string, darkSuffix = '-dark'): ThemeAwareImgIcon {
    return new ThemeAwareImgIcon(basePath, this.themeService, darkSuffix)
  }

  /**
   * Gets the current theme
   */
  get isDark(): boolean {
    return this.themeService.isDark
  }

  /**
   * Gets the current theme as observable
   */
  get themeChange(): Observable<string> {
    return this.themeService.themeChange
  }
}

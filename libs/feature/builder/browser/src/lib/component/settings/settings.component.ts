import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { DialogService, ThemeService } from '@platon/core/browser'

// Interface pour un item de paramètres
export interface SettingItem {
  id: string
  label: string
  icon: string
  type: 'theme' | 'preview' | 'developer'
}

@Component({
  selector: 'lib-settings',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly themeService = inject(ThemeService)
  private readonly dialogService = inject(DialogService)

  selectedSetting = input<SettingItem | null>(null)

  close = output<void>()

  readonly settingItems = signal<SettingItem[]>([
    { id: 'theme', label: 'Thème', icon: 'palette', type: 'theme' },
    { id: 'preview', label: 'Mode prévisualisation', icon: 'preview', type: 'preview' },
    { id: 'developer', label: 'Mode développeur', icon: 'code', type: 'developer' },
  ])

  // Computed: vérifie si le thème actuel est sombre
  readonly isDarkTheme = computed(() => this.themeService.isDark)

  // Computed: vérifie si le thème actuel est clair
  readonly isLightTheme = computed(() => this.themeService.isLight)

  applyTheme(theme: 'light' | 'dark' | 'system'): void {
    document.body.style.opacity = '0'
    document.body.style.transition = 'opacity 0.2s ease-in-out'

    setTimeout(() => {
      if (theme === 'light') {
        this.themeService.lightTheme(true)
      } else if (theme === 'dark') {
        this.themeService.darkTheme(true)
      } else {
        this.themeService.systemTheme(true)
      }
    }, 200)

    setTimeout(() => {
      document.body.style.opacity = '1'
      document.body.style.transition = 'none'
      this.dialogService.success(`Thème ${theme} appliqué`)
    }, 500)
  }
}

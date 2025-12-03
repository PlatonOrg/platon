import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { DialogService, ThemeService, TagService } from '@platon/core/browser'
import { ResourceService, RESOURCE_STATUS_NAMES } from '@platon/feature/resource/browser'
import { Resource, UpdateResource, ResourceStatus } from '@platon/feature/resource/common'
import { Level, Topic } from '@platon/core/common'
import { firstValueFrom } from 'rxjs'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzSpinModule } from 'ng-zorro-antd/spin'

export interface SettingItem {
  id: string
  label: string
  icon: string
  type: 'theme' | 'preview' | 'developer' | 'save'
}

@Component({
  selector: 'app-builder-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NzSelectModule,
    NzSpinModule,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SettingsPage implements OnInit {
  private readonly themeService = inject(ThemeService)
  private readonly dialogService = inject(DialogService)
  private readonly tagService = inject(TagService)
  private readonly resourceService = inject(ResourceService)

  selectedSetting = input<SettingItem | null>(null)
  resource = input.required<Resource>()

  protected currentTheme = signal<string | null>('light')
  protected topics = signal<Topic[]>([])
  protected levels = signal<Level[]>([])
  protected loading = signal(false)
  protected saving = signal(false)

  close = output<void>()
  resourceUpdated = output<Resource>()

  readonly settingItems = signal<SettingItem[]>([
    { id: 'theme', label: 'Thème', icon: 'palette', type: 'theme' },
    { id: 'preview', label: 'Mode prévisualisation', icon: 'preview', type: 'preview' },
    { id: 'developer', label: 'Mode développeur', icon: 'code', type: 'developer' },
    { id: 'save', label: 'Informations', icon: 'info', type: 'save' },
  ])

  readonly isDarkTheme = computed(() => this.themeService.isDark)
  readonly isLightTheme = computed(() => this.themeService.isLight)

  protected form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    desc: new FormControl('', [Validators.required]),
    status: new FormControl<ResourceStatus | null>(null, [Validators.required]),
    topics: new FormControl<string[]>([]),
    levels: new FormControl<string[]>([]),
  })
  protected readonly status = Object.values(ResourceStatus)

  protected get canSubmit(): boolean {
    return this.form.valid && !this.saving()
  }

  async ngOnInit(): Promise<void> {
    if (this.themeService.isLight) {
      this.currentTheme.set('light')
    } else if (this.themeService.isDark) {
      this.currentTheme.set('dark')
    } else {
      this.currentTheme.set('system')
    }

    await this.loadTagsAndInitForm()
  }

  private async loadTagsAndInitForm(): Promise<void> {
    try {
      this.loading.set(true)

      const [topics, levels] = await Promise.all([
        firstValueFrom(this.tagService.listTopics()),
        firstValueFrom(this.tagService.listLevels()),
      ])
      this.topics.set(topics)
      this.levels.set(levels)

      const currentResource = this.resource()
      if (currentResource) {
        this.form.patchValue({
          name: currentResource.name,
          desc: currentResource.desc || '',
          status: currentResource.status,
          topics: currentResource.topics?.map((t) => t.id) || [],
          levels: currentResource.levels?.map((l) => l.id) || [],
        })
      }
    } catch (error) {
      this.dialogService.error('Erreur lors du chargement des données')
    } finally {
      this.loading.set(false)
    }
  }

  protected async saveResourceInfo(): Promise<void> {
    if (!this.canSubmit) return

    const currentResource = this.resource()
    if (!currentResource) return

    try {
      this.saving.set(true)

      const formValue = this.form.value

      const update: UpdateResource = {
        name: formValue.name || currentResource.name,
        desc: formValue.desc || currentResource.desc || '',
        status: formValue.status || currentResource.status,
        topics: formValue.topics || [],
        levels: formValue.levels || [],
      }

      const updatedResource = await firstValueFrom(this.resourceService.update(currentResource.id, update))

      this.dialogService.success('Informations mises à jour avec succès')
      this.resourceUpdated.emit(updatedResource)
    } catch (error) {
      this.dialogService.error('Erreur lors de la sauvegarde des informations')
    } finally {
      this.saving.set(false)
    }
  }

  protected trackByValue(_: number, item: unknown) {
    return item
  }

  protected getStatusLabel(status: ResourceStatus): string {
    return RESOURCE_STATUS_NAMES[status]
  }

  protected async openInEditor(): Promise<void> {
    if (this.resource) {
      window.open(`/editor/${this.resource().id}?version=latest`, '_blank')
    }
  }

  applyTheme(theme: 'light' | 'dark' | 'system'): void {
    document.body.style.opacity = '0'
    document.body.style.transition = 'opacity 0.2s ease-in-out'

    setTimeout(() => {
      if (theme === 'light') {
        this.themeService.lightTheme(true)
        this.currentTheme.set('light')
      } else if (theme === 'dark') {
        this.themeService.darkTheme(true)
        this.currentTheme.set('dark')
      } else {
        this.themeService.systemTheme(true)
        this.currentTheme.set('system')
      }
    }, 200)

    setTimeout(() => {
      document.body.style.opacity = '1'
      document.body.style.transition = 'none'
      this.dialogService.success(`Thème ${theme} appliqué`)
    }, 500)
  }
}

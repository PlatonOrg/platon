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
import { NzButtonModule } from 'ng-zorro-antd/button'

export interface SettingItem {
  id: string
  label: string
  icon: string
  type: 'theme' | 'preview' | 'developer' | 'save'
}

@Component({
  selector: 'app-builder-settings',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NzSelectModule,
    NzSpinModule,
    NzButtonModule,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
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
  protected hasFormChanges = signal(false)

  protected resourceUpdated = output<Resource>()

  readonly isDarkTheme = computed(() => this.themeService.isDark)
  readonly isLightTheme = computed(() => this.themeService.isLight)

  protected form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    desc: new FormControl('', [Validators.required]),
    status: new FormControl<ResourceStatus | null>(ResourceStatus.DRAFT, [Validators.required]),
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

    this.form.valueChanges.subscribe(() => {
      this.hasFormChanges.set(true)
    })
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
          status: currentResource.status || ResourceStatus.DRAFT,
          topics: currentResource.topics?.map((t) => t.id) || [],
          levels: currentResource.levels?.map((l) => l.id) || [],
        })
        setTimeout(() => this.hasFormChanges.set(false), 0)
      }
    } catch (_error) {
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
      this.resourceUpdated.emit(updatedResource)
      this.hasFormChanges.set(false)
    } catch (_error) {
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
      window.location.href = `/editor/${this.resource().id}?version=latest`
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

  protected async onKeyDown(event: KeyboardEvent): Promise<void> {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (this.selectedSetting()?.type === 'save' && this.canSubmit) {
        event.stopPropagation()
        await this.saveResourceInfo()
      }
    }
  }
}

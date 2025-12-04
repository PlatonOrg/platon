import { CommonModule } from '@angular/common'
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  HostListener,
  signal,
} from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { ActivatedRoute, Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDividerModule } from '@angular/material/divider'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatDialog } from '@angular/material/dialog'
import { NzModalService } from 'ng-zorro-antd/modal'
import { PleInput, Variables } from '@platon/feature/compiler'
import { ResourceFileService, ResourceService, getPreviewOverridesStorageKey } from '@platon/feature/resource/browser'
import { Resource } from '@platon/feature/resource/common'
import { DialogModule, DialogService, StorageService } from '@platon/core/browser'
import { Title } from '@angular/platform-browser'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzAlertModule } from 'ng-zorro-antd/alert'
import { firstValueFrom } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { PleInputEditorModule } from '../editor/contributions/editors/ple-input/ple-input.module'
import {
  AIPromptModalComponent,
  AIPromptModalData,
  BuilderIFrameComponent,
  BuilderService,
} from '@platon/feature/builder/browser'
import { UiModalIFrameComponent } from '@platon/shared/ui'

import { type SettingItem, SettingsPage } from './settings/settings.page'
import { VersionHistoryComponent } from './version-history'

interface SidebarSection {
  id: string
  label: string
  icon: string
  collapsed: boolean
}

type MainViewMode = 'input' | 'setting' | 'history'

@Component({
  standalone: true,
  selector: 'app-builder',
  templateUrl: './builder.page.html',
  styleUrls: ['./builder.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatToolbarModule,
    DialogModule,
    NzSpinModule,
    NzAlertModule,
    BuilderIFrameComponent,
    PleInputEditorModule,
    SettingsPage,
    UiModalIFrameComponent,
    VersionHistoryComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BuilderPage implements OnInit {
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly resourceService = inject(ResourceService)
  private readonly resourceFileService = inject(ResourceFileService)
  private readonly dialogService = inject(DialogService)
  private readonly storageService = inject(StorageService)
  private readonly title = inject(Title)
  private readonly http = inject(HttpClient)

  private readonly dialog = inject(MatDialog)
  private readonly builderService = inject(BuilderService)
  private readonly modal = inject(NzModalService)

  protected resource?: Resource
  protected template?: Resource
  protected isTemplateCreator = false
  protected inputs: PleInput[] = []
  protected overrides: Variables = {}
  protected loading = true
  protected saving = false
  protected aiTransforming = false
  protected error?: string

  protected readonly hasUnsavedChanges = signal(false)
  protected currentVersion = 'latest'

  protected selection: PleInput | undefined
  protected selectionIndex = -1

  protected mainViewMode: MainViewMode = 'input'
  protected selectedSetting: SettingItem | null = null

  protected readonly settingItems: SettingItem[] = [
    { id: 'theme', label: 'Thème', icon: 'palette', type: 'theme' },
    { id: 'preview', label: 'Mode prévisualisation', icon: 'preview', type: 'preview' },
    { id: 'developer', label: 'Mode développeur', icon: 'code', type: 'developer' },
    { id: 'save', label: 'Option sauvegarde', icon: 'save', type: 'save' },
  ]

  protected previewSessionId = uuidv4()
  protected showPreview = true
  protected previewUrl = ''
  protected sidebarOpen = true
  private debounceTimeout?: ReturnType<typeof setTimeout>

  protected sidebarWidth = 200
  protected previewWidth = 850
  protected sidebarMinWidth = 60 // Largeur mode icône uniquement

  protected sidebarSections: SidebarSection[] = [
    { id: 'content', label: 'Contenu', icon: 'list', collapsed: false },
    { id: 'settings', label: 'Paramètres', icon: 'settings', collapsed: true },
    { id: 'history', label: 'Historique', icon: 'history', collapsed: true },
  ]

  // État du redimensionnement
  private isResizing = false
  private resizingColumn: 'sidebar' | 'preview' | null = null
  private startX = 0
  private startWidth = 0

  protected toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen

    if (this.sidebarOpen) {
      this.sidebarWidth = 200
    } else {
      this.sidebarWidth = this.sidebarMinWidth // Mode icône uniquement
    }

    this.changeDetectorRef.markForCheck()
  }

  protected toggleSection(sectionId: string): void {
    const section = this.sidebarSections.find((s) => s.id === sectionId)
    if (section) {
      // Si la sidebar est fermée, on l'ouvre d'abord
      if (!this.sidebarOpen) {
        this.sidebarOpen = true
        this.sidebarWidth = 200
      }

      section.collapsed = !section.collapsed

      if (sectionId === 'history' /*&& !section.collapsed*/) {
        this.mainViewMode = 'history'
        this.selection = undefined
        this.selectionIndex = -1
        this.selectedSetting = null
      }
      this.changeDetectorRef.markForCheck()
    }
  }

  redirectToSaveOptions(): void {
    const setting = this.settingItems.find((item) => item.id === 'save')
    if (setting) {
      this.selectSetting(setting)
    }
  }

  protected selectSetting(setting: SettingItem): void {
    this.selectedSetting = setting
    this.mainViewMode = 'setting'
    this.selection = undefined
    this.selectionIndex = -1
    this.changeDetectorRef.markForCheck()
  }

  protected onResizerMouseDown(e: MouseEvent, column: 'sidebar' | 'preview'): void {
    e.preventDefault()
    this.isResizing = true
    this.resizingColumn = column
    this.startX = e.clientX

    if (column === 'sidebar') {
      this.startWidth = this.sidebarWidth
    } else {
      this.startWidth = this.previewWidth
    }
  }

  @HostListener('document:mousemove', ['$event'])
  protected onMouseMove(e: MouseEvent): void {
    if (!this.isResizing || !this.resizingColumn) return

    const delta = e.clientX - this.startX

    if (this.resizingColumn === 'sidebar') {
      // Redimensionner la sidebar (mouvement vers la droite = agrandir)
      const newWidth = this.startWidth + delta
      const minWidth = this.sidebarOpen ? 150 : this.sidebarMinWidth
      this.sidebarWidth = Math.max(minWidth, Math.min(600, newWidth))

      if (this.sidebarWidth <= 150 && this.sidebarOpen) {
        this.sidebarOpen = false
        this.sidebarWidth = this.sidebarMinWidth
      }
      // Si on agrandit, passer en mode complet
      else if (this.sidebarWidth > 150 && !this.sidebarOpen) {
        this.sidebarOpen = true
        this.sidebarWidth = 200
      }
    } else if (this.resizingColumn === 'preview') {
      // Redimensionner la preview (mouvement vers la gauche = agrandir)
      const newWidth = this.startWidth - delta
      this.previewWidth = Math.max(300, Math.min(1000, newWidth))
    }

    this.changeDetectorRef.markForCheck()
  }

  @HostListener('document:mouseup')
  protected onMouseUp(): void {
    this.isResizing = false
    this.resizingColumn = null
  }

  async ngOnInit(): Promise<void> {
    try {
      const resourceId = this.activatedRoute.snapshot.paramMap.get('id')
      const version = this.activatedRoute.snapshot.queryParamMap.get('version') || 'latest'
      if (!resourceId) {
        this.error = 'ID de ressource manquant'
        this.loading = false
        this.changeDetectorRef.markForCheck()
        return
      }

      this.resource = await firstValueFrom(this.resourceService.find({ id: resourceId }))
      this.title.setTitle(`${this.resource.name}`)
      if (!this.resource.templateId || !this.resource.templateVersion) {
        this.error = "Cette ressource n'utilise pas de template"
        this.loading = false
        this.changeDetectorRef.markForCheck()
        return
      }

      this.template = await firstValueFrom(this.resourceService.find({ id: this.resource.templateId }))

      const configFile = await firstValueFrom(
        this.resourceFileService.read(this.resource.templateId, 'main.plc', this.resource.templateVersion)
      )

      const configContent = await firstValueFrom(
        this.http.get<string>(configFile.url, { responseType: 'text' as 'json' })
      )

      const config = JSON.parse(configContent)
      this.inputs = config.inputs || []
      try {
        const overridesFile = await firstValueFrom(this.resourceFileService.read(this.resource.id, 'main.plo', version))

        const overridesContent = await firstValueFrom(
          this.http.get<string>(overridesFile.url, { responseType: 'text' as 'json' })
        )

        const loadedOverrides = JSON.parse(overridesContent)
        this.overrides = loadedOverrides
      } catch (error) {
        this.overrides = {}
      }

      this.inputs = this.inputs.map((input) => ({
        ...input,
        value: this.overrides[input.name] ?? input.value,
      }))

      this.loading = false
      await this.reloadPreview()
      this.changeDetectorRef.markForCheck()
    } catch (error) {
      console.error(error)
      this.error = 'Erreur lors du chargement de la configuration'
      this.dialogService.error(this.error)
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected onInputChange(input: PleInput): void {
    this.overrides = {
      ...this.overrides,
      [input.name]: input.value,
    }

    const index = this.inputs.findIndex((i) => i.name === input.name)
    if (index !== -1) {
      this.inputs = [...this.inputs.slice(0, index), { ...input }, ...this.inputs.slice(index + 1)]
    }

    this.hasUnsavedChanges.set(true)

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(() => {
      if (this.showPreview && this.resource) {
        this.reloadPreview().catch(console.error)
      }
    }, 1)

    this.changeDetectorRef.markForCheck()
  }

  protected selectInput(index: number): void {
    this.selection = this.inputs[index]
    this.selectionIndex = index
    this.mainViewMode = 'input'
    this.selectedSetting = null
    this.changeDetectorRef.markForCheck()
  }

  protected async save(): Promise<void> {
    if (!this.resource) return

    try {
      this.saving = true
      this.changeDetectorRef.markForCheck()
      try {
        const overridesFile = await firstValueFrom(
          this.resourceFileService.read(this.resource.id, 'main.plo', 'latest')
        )

        await firstValueFrom(
          this.resourceFileService.update(
            { url: overridesFile.url },
            { content: JSON.stringify(this.overrides, null, 2) }
          )
        )
      } catch (readError) {
        await firstValueFrom(
          this.resourceFileService.create(this.resource.id, [
            {
              path: 'main.plo',
              content: JSON.stringify(this.overrides, null, 2),
            },
          ])
        )
      }

      this.hasUnsavedChanges.set(false)

      this.dialogService.success('Configuration sauvegardée avec succès')
    } catch (error) {
      this.dialogService.error('Erreur lors de la sauvegarde')
    } finally {
      this.saving = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async onResourceUpdated(updatedResource: Resource): Promise<void> {
    this.resource = updatedResource
    this.hasUnsavedChanges.set(true)
    this.title.setTitle(`${this.resource.name}`)
    await this.save()
    this.changeDetectorRef.markForCheck()
  }

  private async reloadPreview(): Promise<void> {
    if (!this.resource) return

    try {
      await firstValueFrom(
        this.storageService.set(getPreviewOverridesStorageKey(this.previewSessionId), JSON.stringify(this.overrides))
      )

      this.previewUrl = ''
      await new Promise((resolve) => setTimeout(resolve, 1))

      this.previewUrl = `/player/preview/${this.resource.id}?version=latest&sessionId=${
        this.previewSessionId
      }&fromBuilder=true&timestamp=${Date.now()}`

      this.changeDetectorRef.detectChanges()
    } catch (error) {
      console.error('Erreur lors du rechargement de la prévisualisation:', error)
    }
  }

  protected async openInEditor(): Promise<void> {
    if (this.resource) {
      window.open(`/editor/${this.resource.id}?version=latest`, '_blank')
    }
  }

  protected get previewUrlFrame(): string {
    if (!this.resource) {
      return ''
    }
    firstValueFrom(
      this.storageService.set(getPreviewOverridesStorageKey(this.previewSessionId), JSON.stringify(this.overrides))
    ).catch(console.error)

    return `/player/preview/${this.resource.id}?version=latest&sessionId=${this.previewSessionId}`
  }

  protected async openAITransform(): Promise<void> {
    const dialogRef = this.dialog.open(AIPromptModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true,
    })

    const result: AIPromptModalData | null = await firstValueFrom(dialogRef.afterClosed())

    if (!result) {
      return
    }

    try {
      this.aiTransforming = true
      this.changeDetectorRef.markForCheck()

      const response = await firstValueFrom(
        this.builderService.transformInputsWithAI({
          inputs: this.inputs,
          prompt: result.prompt,
          provider: result.provider,
          model: result.model,
        })
      )

      this.inputs = response.inputs.map((transformedInput: PleInput) => {
        const originalInput = this.inputs.find((i) => i.name === transformedInput.name)
        return {
          ...originalInput,
          ...transformedInput,
        }
      })

      this.inputs.forEach((input) => {
        this.overrides[input.name] = input.value
      })

      if (this.selection && this.selectionIndex >= 0) {
        this.selection = this.inputs[this.selectionIndex]
      }

      this.hasUnsavedChanges.set(true)

      await this.reloadPreview()

      const usageText = response.usage ? ` (${response.usage.totalTokens} tokens utilisés)` : ''

      this.dialogService.success(`Configuration transformée avec succès !${usageText}`)
    } catch (error: unknown) {
      let errorMessage = 'Erreur lors de la transformation IA'

      if (error && typeof error === 'object') {
        const err = error as { status?: number; error?: { message?: string }; message?: string }

        if (err.status === 401) {
          errorMessage = 'Clé API invalide ou expirée'
        } else if (err.status === 429) {
          errorMessage = 'Limite de requêtes atteinte. Veuillez réessayer plus tard.'
        } else if (err.error?.message) {
          errorMessage = err.error.message
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      this.dialogService.error(errorMessage)
    } finally {
      this.aiTransforming = false
      this.changeDetectorRef.markForCheck()
    }
  }

  // ICI J'IMPORTE LA NOUVELLE VERSION
  protected async onVersionChanged(data: { version: string; overrides: Variables }): Promise<void> {
    try {
      this.overrides = data.overrides
      if (data.version !== this.currentVersion) {
        this.hasUnsavedChanges.set(true)
      }

      this.inputs = this.inputs.map((input) => ({
        ...input,
        value: this.overrides[input.name] ?? input.value,
      }))

      if (this.selection && this.selectionIndex >= 0) {
        this.selection = this.inputs[this.selectionIndex]
      }
      await this.reloadPreview()
      this.dialogService.success(`Affichage de la version "${data.version}"`)
      this.changeDetectorRef.markForCheck()
    } catch (error) {
      this.dialogService.error('Impossible de charger la version sélectionnée')
    }
  }

  private confirmUnsavedChanges(): Promise<'cancel' | 'save' | 'discard'> {
    return new Promise((resolve) => {
      const modalRef = this.modal.create({
        nzTitle: 'Modifications non sauvegardées',
        nzContent: 'Vous avez des modifications non sauvegardées. Que voulez-vous faire ?',
        nzClosable: false,
        nzCancelText: null,
        nzOkText: null,
        nzFooter: [
          {
            label: 'Annuler',
            type: 'default',
            onClick: () => {
              modalRef.destroy()
              resolve('cancel')
            },
          },
          {
            label: 'Quitter sans sauvegarder',
            type: 'primary',
            danger: true,
            onClick: () => {
              modalRef.destroy()
              resolve('discard')
            },
          },
          {
            label: 'Sauvegarder',
            type: 'primary',
            onClick: () => {
              modalRef.destroy()
              resolve('save')
            },
          },
        ],
      })
    })
  }

  protected async goBack(): Promise<void> {
    if (this.hasUnsavedChanges()) {
      const action = await this.confirmUnsavedChanges()

      if (action === 'cancel') {
        return
      }

      if (action === 'save') {
        this.redirectToSaveOptions()
        return
      }
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    if (this.previewSessionId) {
      firstValueFrom(this.storageService.remove(getPreviewOverridesStorageKey(this.previewSessionId))).catch(
        console.error
      )
    }

    if (this.resource) {
      this.router.navigate(['/resources', this.resource.id]).catch(console.error)
    } else {
      this.router.navigate(['/resources']).catch(console.error)
    }
  }

  protected trackInput(_: number, input: PleInput): string {
    return input.name
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault()
      event.returnValue = true
    }

    if (this.previewSessionId) {
      firstValueFrom(this.storageService.remove(getPreviewOverridesStorageKey(this.previewSessionId))).catch(
        console.error
      )
    }
  }
}

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
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDividerModule } from '@angular/material/divider'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatDialog } from '@angular/material/dialog'
import { NzModalService } from 'ng-zorro-antd/modal'
import { PleInput, Variables } from '@platon/feature/compiler'
import {
  InputFileService,
  ResourceFileService,
  ResourceService,
  getPreviewOverridesStorageKey,
} from '@platon/feature/resource/browser'
import { Resource } from '@platon/feature/resource/common'
import { DialogModule, DialogService, StorageService } from '@platon/core/browser'
import { Title } from '@angular/platform-browser'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { firstValueFrom } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { PleInputEditorModule } from '../editor/contributions/editors/ple-input/ple-input.module'
import {
  AIPromptModalComponent,
  AIPromptModalData,
  BuilderIFrameComponent,
  BuilderService,
} from '@platon/feature/builder/browser'
import { UiErrorComponent, UiModalIFrameComponent } from '@platon/shared/ui'

import { type SettingItem, SettingsPage } from './settings/settings.page'
import { VersionHistoryComponent } from './version-history'

import { NgeIdeModule } from '@cisstech/nge-ide'

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
    BuilderIFrameComponent,
    PleInputEditorModule,
    SettingsPage,
    UiModalIFrameComponent,
    VersionHistoryComponent,
    UiErrorComponent,

    NgeIdeModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)',
    '(document:mousemove)': 'onMouseMove($event)',
    '(document:mouseup)': 'onMouseUp()',
  },
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

  private readonly inputFileService = inject(InputFileService)

  protected resource?: Resource
  protected template?: Resource
  protected isTemplateCreator = false
  protected inputs: PleInput[] = []
  protected overrides: Variables = {}
  protected loading = true
  protected saving = false
  protected aiTransforming = false
  protected error?: HttpErrorResponse | null = null

  private isFirstSave = true
  private initialHistoryLength = 0

  protected readonly hasUnsavedChanges = signal(false)
  protected currentVersion = 'latest'
  protected isEditingTitle = false

  protected selection: PleInput | undefined
  protected selectionIndex = -1

  protected mainViewMode: MainViewMode = 'input'
  protected selectedSetting: SettingItem | null = null

  protected readonly settingItems: SettingItem[] = [
    { id: 'save', label: 'Option sauvegarde', icon: 'save', type: 'save' },
    { id: 'developer', label: 'Mode développeur', icon: 'code', type: 'developer' },
    { id: 'theme', label: 'Thème', icon: 'palette', type: 'theme' },
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
    { id: 'settings', label: 'Paramètres', icon: 'settings', collapsed: true },
    { id: 'content', label: 'Contenu', icon: 'list', collapsed: false },
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

  protected onMouseUp(): void {
    this.isResizing = false
    this.resizingColumn = null
  }

  async ngOnInit(): Promise<void> {
    this.initialHistoryLength = window.history.length
    try {
      const resourceId = this.activatedRoute.snapshot.paramMap.get('id')
      const version = this.activatedRoute.snapshot.queryParamMap.get('version') || 'latest'
      if (!resourceId) {
        throw new HttpErrorResponse({
          error: { message: 'ID de ressource manquant' },
          status: 400,
          statusText: 'Bad Request',
        })
      }

      this.resource = await firstValueFrom(this.resourceService.find({ id: resourceId }))
      this.title.setTitle(`${this.resource.name}`)
      if (!this.resource.templateId || !this.resource.templateVersion) {
        throw new HttpErrorResponse({
          error: { message: "Cette ressource n'utilise pas de template" },
          status: 400,
          statusText: 'Bad Request',
        })
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
      // init and register component for InputFileService with dialogue message
      this.inputFileService.init(this.resource.id, version, true, true)
      this.inputs.forEach((input) => {
        if (input.type === 'file') {
          const fileReference = (input.value?.replace(/@copycontent|@copyurl/g, '') || '').trim()
          this.inputFileService.register(input.name, fileReference)
        }
      })

      this.loading = false
      await this.reloadPreview()
      this.changeDetectorRef.markForCheck()
    } catch (error) {
      this.loading = false
      if (error instanceof HttpErrorResponse) {
        this.error = error
        this.changeDetectorRef.markForCheck()
      } else {
        throw error
      }
    }
  }

  protected onInputChange(input: PleInput): void {
    const isReallyChanged = this.overrides[input.name] !== input.value
    this.overrides = {
      ...this.overrides,
      [input.name]: input.value,
    }

    const index = this.inputs.findIndex((i) => i.name === input.name)
    if (index !== -1) {
      this.inputs = [...this.inputs.slice(0, index), { ...input }, ...this.inputs.slice(index + 1)]
    }
    if (isReallyChanged) {
      // show unsave indicateur (not for in file modification)
      this.hasUnsavedChanges.set(true)
    }

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

    // Si c'est la première sauvegarde ET (titre par défaut OU brouillon)
    // alors rediriger vers l'option sauvegarde
    if (this.isFirstSave) {
      const hasDefaultName = this.hasDefaultResourceName(this.resource.name)
      const isDraft = this.resource.status === 'DRAFT'

      if (hasDefaultName && isDraft) {
        this.isFirstSave = false
        this.redirectToSaveOptions()
        return
      }
    }

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
      await this.inputFileService.save()

      this.dialogService.success('Sauvegardé avec succès')
      this.showFirstSaveInfo()
    } catch (error) {
      this.dialogService.error('Erreur lors de la sauvegarde')
    } finally {
      this.saving = false
      this.changeDetectorRef.markForCheck()
    }
  }

  /**
   * Vérifie si le nom de l'exercice correspond au format par défaut généré lors de la création.
   * Format attendu: "Exercice - DD/MM/YYYY HH:MM" (ex: "Exercice - 03/02/2026 14:30")
   *
   * IMPORTANT: Ce format doit rester synchronisé avec celui défini dans
   * template-selection.component.ts (méthode createQuickResource).
   * Si le format de génération du nom change, mettre à jour ce regex en conséquence.
   */
  private hasDefaultResourceName(name: string): boolean {
    const defaultNamePattern = /^Exercice - \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/
    return defaultNamePattern.test(name)
  }

  private showFirstSaveInfo(): void {
    if (!this.resource) return

    const hasDefaultName = this.hasDefaultResourceName(this.resource.name)
    const isDraft = this.resource.status === 'DRAFT'

    if (!hasDefaultName && !isDraft) return

    let content = '<div style="line-height: 1.8; padding: 8px 0;">'

    if (hasDefaultName) {
      content +=
        '<p><strong>Conseil :</strong> Votre exercice garde actuellement le nom par défaut "<em>' +
        this.resource.name +
        '</em>". '
      content += "Vous pouvez le personnaliser en cliquant sur l'icône d'édition à côté du titre.</p>"
    }

    if (isDraft) {
      // On ne veut pas spammer si le nom est personnalisé mais que le statut est en brouillon
      if (hasDefaultName) content += '<br>'
      content += '<p><strong>Statut :</strong> Votre exercice est actuellement en <strong>brouillon</strong>. '
      content += 'Pour changer le statut, rendez-vous dans <strong>Paramètres → Option sauvegarde</strong>.</p>'
    }

    content += '</div>'

    this.modal.info({
      nzTitle: 'Exercice sauvegardé !',
      nzContent: content,
      nzWidth: 550,
      nzOkText: 'Compris',
      nzCentered: true,
    })
  }

  protected redirectToSaveOptions(): void {
    const setting = this.settingItems.find((item) => item.id === 'save')
    if (setting) {
      this.selectSetting(setting)
    }
  }

  protected async onResourceUpdated(updatedResource: Resource): Promise<void> {
    this.resource = updatedResource
    this.title.setTitle(`${this.resource.name}`)
    this.isFirstSave = false
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
      window.location.href = `/editor/${this.resource.id}?version=latest`
    }
  }

  protected startEditingTitle(): void {
    this.isEditingTitle = true
    this.changeDetectorRef.markForCheck()

    setTimeout(() => {
      const input = document.querySelector('.title-input') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }

  protected cancelEditingTitle(): void {
    this.isEditingTitle = false
    this.changeDetectorRef.markForCheck()
  }

  protected async saveTitle(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const newName = input.value.trim()

    if (!newName || !this.resource || newName === this.resource.name) {
      this.isEditingTitle = false
      this.changeDetectorRef.markForCheck()
      return
    }

    try {
      const updatedResource = await firstValueFrom(this.resourceService.update(this.resource.id, { name: newName }))

      this.resource = updatedResource
      this.title.setTitle(newName)
      this.isEditingTitle = false
      this.dialogService.success('Nom mis à jour avec succès')
      this.changeDetectorRef.markForCheck()
    } catch (error) {
      this.dialogService.error('Erreur lors de la mise à jour du nom')
      this.isEditingTitle = false
      this.changeDetectorRef.markForCheck()
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
        await this.save()
      }
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.hasUnsavedChanges.set(false)

    if (this.previewSessionId) {
      firstValueFrom(this.storageService.remove(getPreviewOverridesStorageKey(this.previewSessionId))).catch(
        console.error
      )
    }
    const steps = window.history.length - this.initialHistoryLength + 1
    window.history.go(-Math.max(1, steps))
  }

  protected trackInput(_: number, input: PleInput): string {
    return input.name
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      // Ne pas sauvegarder si on est en mode settings (save) (le save gère lui-même le Ctrl+S)
      if (!this.saving && this.selectedSetting?.type !== 'save') {
        this.save().catch(console.error)
      }
    }
  }

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

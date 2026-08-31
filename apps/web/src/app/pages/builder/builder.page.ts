import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
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
  isExerciseBuilderDefaultName,
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
  selector: 'app-builder',
  templateUrl: './builder.page.html',
  styleUrls: ['./builder.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
    '(window:pageshow)': 'onPageShow($event)',
    '(document:mousemove)': 'onMouseMove($event)',
    '(document:mouseup)': 'onMouseUp()',
  },
})
export class BuilderPage implements OnInit {
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
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

  protected readonly resource = signal<Resource | undefined>(undefined)
  protected readonly template = signal<Resource | undefined>(undefined)
  protected readonly isTemplateCreator = signal(false)
  protected readonly inputs = signal<PleInput[]>([])
  protected readonly overrides = signal<Variables>({})
  protected readonly overridesTemplateBase = signal<Variables>({})
  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly aiTransforming = signal(false)
  protected readonly error = signal<HttpErrorResponse | null | undefined>(null)
  protected readonly hasUnsavedChanges = signal(false)
  protected readonly currentVersion = signal('latest')
  protected readonly isEditingTitle = signal(false)
  protected readonly selection = signal<PleInput | undefined>(undefined)
  protected readonly selectionIndex = signal(-1)
  protected readonly mainViewMode = signal<MainViewMode>('input')
  protected readonly selectedSetting = signal<SettingItem | null>(null)
  protected readonly showPreview = signal(true)
  protected readonly previewUrl = signal('')
  protected readonly sidebarOpen = signal(true)
  protected readonly sidebarWidth = signal(200)
  protected readonly previewWidth = signal(850)

  private readonly isFirstSave = signal(true)
  private debounceTimeout?: ReturnType<typeof setTimeout>
  private reloadGeneration = 0

  protected readonly sidebarMinWidth = 60
  private isResizing = false
  private resizingColumn: 'sidebar' | 'preview' | null = null
  private startX = 0
  private startWidth = 0

  protected readonly previewSessionId = uuidv4()

  protected readonly settingItems: SettingItem[] = [
    { id: 'save', label: 'Option sauvegarde', icon: 'save', type: 'save' },
    { id: 'developer', label: 'Mode développeur', icon: 'code', type: 'developer' },
    { id: 'theme', label: 'Thème', icon: 'palette', type: 'theme' },
  ]

  protected readonly sidebarSections = signal<SidebarSection[]>([
    { id: 'settings', label: 'Paramètres', icon: 'settings', collapsed: true },
    { id: 'content', label: 'Contenu', icon: 'list', collapsed: false },
    { id: 'history', label: 'Historique', icon: 'history', collapsed: true },
  ])

  protected toggleSidebar(): void {
    const open = !this.sidebarOpen()
    this.sidebarOpen.set(open)
    this.sidebarWidth.set(open ? 200 : this.sidebarMinWidth)
  }

  protected toggleSection(sectionId: string): void {
    const section = this.sidebarSections().find((s) => s.id === sectionId)
    if (!section) return

    if (!this.sidebarOpen()) {
      this.sidebarOpen.set(true)
      this.sidebarWidth.set(200)
    }

    this.sidebarSections.update((sections) =>
      sections.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    )

    if (sectionId === 'history') {
      this.mainViewMode.set('history')
      this.selection.set(undefined)
      this.selectionIndex.set(-1)
      this.selectedSetting.set(null)
    }
  }

  protected selectSetting(setting: SettingItem): void {
    this.selectedSetting.set(setting)
    this.mainViewMode.set('setting')
    this.selection.set(undefined)
    this.selectionIndex.set(-1)
  }

  protected onResizerMouseDown(e: MouseEvent, column: 'sidebar' | 'preview'): void {
    e.preventDefault()
    this.isResizing = true
    this.resizingColumn = column
    this.startX = e.clientX
    this.startWidth = column === 'sidebar' ? this.sidebarWidth() : this.previewWidth()
  }

  protected onMouseMove(e: MouseEvent): void {
    if (!this.isResizing || !this.resizingColumn) return

    const delta = e.clientX - this.startX

    if (this.resizingColumn === 'sidebar') {
      const newWidth = this.startWidth + delta
      const minWidth = this.sidebarOpen() ? 150 : this.sidebarMinWidth
      const clamped = Math.max(minWidth, Math.min(600, newWidth))
      this.sidebarWidth.set(clamped)

      if (clamped <= 150 && this.sidebarOpen()) {
        this.sidebarOpen.set(false)
        this.sidebarWidth.set(this.sidebarMinWidth)
      } else if (clamped > 150 && !this.sidebarOpen()) {
        this.sidebarOpen.set(true)
        this.sidebarWidth.set(200)
      }
    } else {
      const newWidth = this.startWidth - delta
      this.previewWidth.set(Math.max(300, Math.min(1000, newWidth)))
    }
  }

  protected onMouseUp(): void {
    this.isResizing = false
    this.resizingColumn = null
  }

  async ngOnInit(): Promise<void> {
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

      const resource = await firstValueFrom(this.resourceService.find({ id: resourceId }))
      this.resource.set(resource)
      this.title.setTitle(resource.name)

      if (!resource.templateId || !resource.templateVersion) {
        throw new HttpErrorResponse({
          error: { message: "Cette ressource n'utilise pas de template" },
          status: 400,
          statusText: 'Bad Request',
        })
      }

      this.template.set(await firstValueFrom(this.resourceService.find({ id: resource.templateId })))

      const configFile = await firstValueFrom(
        this.resourceFileService.read(resource.templateId, 'main.plc', resource.templateVersion)
      )
      const configContent = await firstValueFrom(
        this.http.get<string>(configFile.url, { responseType: 'text' as 'json' })
      )
      const config = JSON.parse(configContent)
      const inputs: PleInput[] = config.inputs || []

      await this.loadOverrides(resource.id, version, inputs)

      this.loading.set(false)
      await this.reloadPreview()
    } catch (error) {
      this.loading.set(false)
      if (error instanceof HttpErrorResponse) {
        this.error.set(error)
      } else {
        throw error
      }
    }
  }

  protected onInputChange(input: PleInput): void {
    const isReallyChanged = this.overrides()[input.name] !== input.value
    this.overrides.update((overrides) => ({ ...overrides, [input.name]: input.value }))
    this.inputs.update((inputs) => {
      const index = inputs.findIndex((i) => i.name === input.name)
      if (index === -1) return inputs
      return [...inputs.slice(0, index), { ...input }, ...inputs.slice(index + 1)]
    })
    this.selection.set(input)

    if (isReallyChanged) {
      this.hasUnsavedChanges.set(true)
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(() => {
      if (this.showPreview() && this.resource()) {
        this.reloadPreview().catch(console.error)
      }
    }, 1)
  }

  protected selectInput(index: number): void {
    this.selection.set(this.inputs()[index])
    this.selectionIndex.set(index)
    this.mainViewMode.set('input')
    this.selectedSetting.set(null)
  }

  protected async save(): Promise<void> {
    const resource = this.resource()
    if (!resource) return

    if (this.isFirstSave()) {
      const hasDefaultName = this.hasDefaultResourceName(resource.name)
      const isDraft = resource.status === 'DRAFT'

      if (hasDefaultName && isDraft) {
        this.isFirstSave.set(false)
        this.redirectToSaveOptions()
        return
      }
    }

    await this.persistOverrides(resource)
  }

  private async persistOverrides(resource: Resource, showFirstSaveInfo = true): Promise<void> {
    try {
      this.saving.set(true)
      try {
        const overridesFile = await firstValueFrom(this.resourceFileService.read(resource.id, 'main.plo', 'latest'))
        await firstValueFrom(
          this.resourceFileService.update(
            { url: overridesFile.url },
            { content: JSON.stringify(this.overrides(), null, 2) }
          )
        )
      } catch {
        await firstValueFrom(
          this.resourceFileService.create(resource.id, [
            { path: 'main.plo', content: JSON.stringify(this.overrides(), null, 2) },
          ])
        )
      }

      this.hasUnsavedChanges.set(false)
      await this.inputFileService.save()
      this.dialogService.success('Sauvegardé avec succès')
      if (showFirstSaveInfo) this.showFirstSaveInfo()
    } catch {
      this.dialogService.error('Erreur lors de la sauvegarde')
    } finally {
      this.saving.set(false)
    }
  }

  private hasDefaultResourceName(name: string): boolean {
    return isExerciseBuilderDefaultName(name)
  }

  private showFirstSaveInfo(): void {
    const resource = this.resource()
    if (!resource) return

    const hasDefaultName = this.hasDefaultResourceName(resource.name)
    const isDraft = resource.status === 'DRAFT'

    if (!hasDefaultName && !isDraft) return

    let content = '<div style="line-height: 1.8; padding: 8px 0;">'

    if (hasDefaultName) {
      content +=
        '<p><strong>Conseil :</strong> Votre exercice garde actuellement le nom par défaut "<em>' +
        resource.name +
        '</em>". '
      content += "Vous pouvez le personnaliser en cliquant sur l'icône d'édition à côté du titre.</p>"
    }

    if (isDraft) {
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
    this.resource.set(updatedResource)
    this.title.setTitle(updatedResource.name)
    this.isFirstSave.set(false)
    await this.save()
  }

  private async loadOverrides(resourceId: string, version: string, baseInputs: PleInput[]): Promise<void> {
    try {
      const overridesFile = await firstValueFrom(this.resourceFileService.read(resourceId, 'main.plo', version))
      const overridesContent = await firstValueFrom(
        this.http.get<string>(overridesFile.url, { responseType: 'text' as 'json' })
      )
      this.overrides.set(JSON.parse(overridesContent))
      this.overridesTemplateBase.set(JSON.parse(overridesContent))
    } catch {
      this.overrides.set({})
      this.overridesTemplateBase.set({})
    }

    const inputs = baseInputs.map((input) => ({ ...input, value: this.overrides()[input.name] ?? input.value }))
    this.inputs.set(inputs)

    this.inputFileService.init(resourceId, version, true, true)
    inputs.forEach((input) => {
      if (input.type === 'file') {
        const fileReference = (input.value?.replace(/@copycontent|@copyurl/g, '') || '').trim()
        this.inputFileService.register(input.name, fileReference)
      }
    })
  }

  protected async onPageShow(event: PageTransitionEvent): Promise<void> {
    if (!event.persisted) return
    const resource = this.resource()
    if (!resource) return
    const version = this.activatedRoute.snapshot.queryParamMap.get('version') || 'latest'
    await this.loadOverrides(resource.id, version, this.inputs())
    await this.reloadPreview()
  }

  private async reloadPreview(): Promise<void> {
    const resource = this.resource()
    if (!resource) return

    const gen = ++this.reloadGeneration

    try {
      await firstValueFrom(
        this.storageService.set(getPreviewOverridesStorageKey(this.previewSessionId), JSON.stringify(this.overrides()))
      )

      if (gen !== this.reloadGeneration) return

      this.previewUrl.set(
        `/player/preview/${resource.id}?version=latest&sessionId=${
          this.previewSessionId
        }&fromBuilder=true&timestamp=${Date.now()}`
      )
    } catch (error) {
      console.error('Erreur lors du rechargement de la prévisualisation:', error)
    }
  }

  protected async openInEditor(): Promise<void> {
    const resource = this.resource()
    if (resource) {
      window.location.href = `/editor/${resource.id}?version=latest`
    }
  }

  protected startEditingTitle(): void {
    this.isEditingTitle.set(true)
    setTimeout(() => {
      const input = document.querySelector('.title-input') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }

  protected cancelEditingTitle(): void {
    this.isEditingTitle.set(false)
  }

  protected async saveTitle(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const newName = input.value.trim()
    const resource = this.resource()

    if (!newName || !resource || newName === resource.name) {
      this.isEditingTitle.set(false)
      return
    }

    try {
      const updatedResource = await firstValueFrom(this.resourceService.update(resource.id, { name: newName }))
      this.resource.set(updatedResource)
      this.title.setTitle(newName)
      this.isEditingTitle.set(false)
      this.dialogService.success('Nom mis à jour avec succès')
    } catch {
      this.dialogService.error('Erreur lors de la mise à jour du nom')
      this.isEditingTitle.set(false)
    }
  }

  protected get previewUrlFrame(): string {
    const resource = this.resource()
    if (!resource) return ''
    firstValueFrom(
      this.storageService.set(getPreviewOverridesStorageKey(this.previewSessionId), JSON.stringify(this.overrides()))
    ).catch(console.error)
    return `/player/preview/${resource.id}?version=latest&sessionId=${this.previewSessionId}`
  }

  protected async openAITransform(): Promise<void> {
    const dialogRef = this.dialog.open(AIPromptModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true,
    })

    const result: AIPromptModalData | null = await firstValueFrom(dialogRef.afterClosed())
    if (!result) return

    try {
      this.aiTransforming.set(true)

      const response = await firstValueFrom(
        this.builderService.transformInputsWithAI({
          inputs: this.inputs(),
          prompt: result.prompt,
          provider: result.provider,
          model: result.model,
        })
      )

      const newInputs = response.inputs.map((transformedInput: PleInput) => {
        const originalInput = this.inputs().find((i) => i.name === transformedInput.name)
        return { ...originalInput, ...transformedInput }
      })
      this.inputs.set(newInputs)

      const newOverrides = { ...this.overrides() }
      newInputs.forEach((input: PleInput) => {
        newOverrides[input.name] = input.value
      })
      this.overrides.set(newOverrides)

      if (this.selection() && this.selectionIndex() >= 0) {
        this.selection.set(newInputs[this.selectionIndex()])
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
      this.aiTransforming.set(false)
    }
  }

  protected async onVersionChanged(data: { version: string; overrides: Variables }): Promise<void> {
    try {
      this.overrides.set(data.overrides)
      if (data.version !== this.currentVersion()) {
        this.hasUnsavedChanges.set(true)
      }

      this.inputs.update((inputs) =>
        inputs.map((input) => ({ ...input, value: data.overrides[input.name] ?? input.value }))
      )

      if (this.selection() && this.selectionIndex() >= 0) {
        this.selection.set(this.inputs()[this.selectionIndex()])
      }

      await this.reloadPreview()
      this.dialogService.success(`Affichage de la version "${data.version}"`)
    } catch {
      this.dialogService.error('Impossible de charger la version sélectionnée')
    }
  }

  private confirmUnsavedChanges(): Promise<'cancel' | 'save' | 'discard' | 'destroy'> {
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
          // {
          //   label: 'Quitter sans sauvegarder les modifications',
          //   type: 'primary',
          //   danger: true,
          //   onClick: () => {
          //     modalRef.destroy()
          //     resolve('discard')
          //   },
          // },
          {
            label: 'Quitter et supprimer',
            type: 'primary',
            danger: true,
            onClick: () => {
              modalRef.destroy()
              resolve('destroy')
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

  private async deleteResource(): Promise<boolean> {
    return firstValueFrom(this.resourceService.delete(this.resource()!))
      .then(() => {
        return true
      })
      .catch(() => false)
  }

  protected goBack(): void {
    window.history.go(-1)
  }

  async canDeactivate(): Promise<boolean> {
    if (this.hasUnsavedChanges()) {
      const action = await this.confirmUnsavedChanges()
      if (action === 'cancel') return false
      if (action === 'save') {
        const resource = this.resource()
        if (resource) await this.persistOverrides(resource, false)
      }
      if (action === 'destroy') await this.deleteResource()
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
    if (JSON.stringify(this.overridesTemplateBase()) === JSON.stringify(this.overrides())) {
      await this.deleteResource()
    }
    return true
  }

  protected trackInput(_: number, input: PleInput): string {
    return input.name
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (!this.saving() && this.selectedSetting()?.type !== 'save') {
        this.save().catch(console.error)
      }
    }
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault()
    }

    if (this.previewSessionId) {
      firstValueFrom(this.storageService.remove(getPreviewOverridesStorageKey(this.previewSessionId))).catch(
        console.error
      )
    }
  }
}

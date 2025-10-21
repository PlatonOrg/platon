import { CommonModule } from '@angular/common'
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  AfterViewInit,
  inject,
  HostListener,
} from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { ActivatedRoute, Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDividerModule } from '@angular/material/divider'
import { MatToolbarModule } from '@angular/material/toolbar'
import { PleInput, Variables } from '@platon/feature/compiler'
import { ResourceFileService, ResourceService } from '@platon/feature/resource/browser'
import { Resource } from '@platon/feature/resource/common'
import { DialogModule, DialogService, StorageService } from '@platon/core/browser'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzAlertModule } from 'ng-zorro-antd/alert'
import { firstValueFrom } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { PleInputEditorModule } from '../editor/contributions/editors/ple-input/ple-input.module'
import { BuilderIFrameComponent } from './builder-iframe/builder-iframe.component'
import { getPreviewOverridesStorageKey } from '@platon/feature/resource/browser'

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
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BuilderPage implements OnInit, AfterViewInit {
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly resourceService = inject(ResourceService)
  private readonly resourceFileService = inject(ResourceFileService)
  private readonly dialogService = inject(DialogService)
  private readonly storageService = inject(StorageService)
  private readonly http = inject(HttpClient)

  protected resource?: Resource
  protected template?: Resource
  protected isTemplateCreator = false
  protected inputs: PleInput[] = []
  protected overrides: Variables = {}
  protected loading = true
  protected saving = false
  protected error?: string

  protected selection: PleInput | undefined
  protected selectionIndex = -1

  protected previewSessionId = uuidv4()
  protected showPreview = true
  protected previewUrl = ''
  protected sidebarOpen = true
  private debounceTimeout?: ReturnType<typeof setTimeout>

  // Largeurs des colonnes
  protected sidebarWidth = 200 //205 //240 //280
  protected previewWidth = 850 //800

  // État du redimensionnement
  private isResizing = false
  private resizingColumn: 'sidebar' | 'preview' | null = null
  private startX = 0
  private startWidth = 0

  protected toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen
    this.changeDetectorRef.markForCheck()
  }

  ngAfterViewInit(): void {
    // Les événements de souris sont gérés via @HostListener
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
      this.sidebarWidth = Math.max(200, Math.min(600, newWidth))
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
      if (!resourceId) {
        this.error = 'ID de ressource manquant'
        this.loading = false
        this.changeDetectorRef.markForCheck()
        return
      }

      this.resource = await firstValueFrom(this.resourceService.find({ id: resourceId }))

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
        const overridesFile = await firstValueFrom(
          this.resourceFileService.read(this.resource.id, 'main.plo', 'latest')
        )

        const overridesContent = await firstValueFrom(
          this.http.get<string>(overridesFile.url, { responseType: 'text' as 'json' })
        )

        const loadedOverrides = JSON.parse(overridesContent)
        this.overrides = loadedOverrides
      } catch (error) {
        console.log("Aucun fichier d'overrides trouvé")
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
  }

  protected async save(): Promise<void> {
    if (!this.resource) return

    try {
      this.saving = true
      this.changeDetectorRef.markForCheck()

      console.log('Sauvegarde des overrides :', this.overrides)

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

        console.log('Fichier overrides.plo mis à jour avec succès')
      } catch (readError) {
        console.log("Le fichier n'existe pas, création...")
        await firstValueFrom(
          this.resourceFileService.create(this.resource.id, [
            {
              path: 'main.plo',
              content: JSON.stringify(this.overrides, null, 2),
            },
          ])
        )

        console.log('Fichier main.plo créé avec succès')
      }

      this.dialogService.success('Configuration sauvegardée avec succès')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error)
      this.dialogService.error('Erreur lors de la sauvegarde')
    } finally {
      this.saving = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async togglePreview(): Promise<void> {
    this.showPreview = !this.showPreview

    if (this.showPreview && this.resource) {
      await this.reloadPreview()
    }

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

  protected goBack(): void {
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

  protected trackInput(index: number, input: PleInput): string {
    return input.name
  }

  @HostListener('window:beforeunload')
  private cleanLocalStorage(): void {
    if (this.previewSessionId) {
      firstValueFrom(this.storageService.remove(getPreviewOverridesStorageKey(this.previewSessionId))).catch(
        console.error
      )
    }
  }
}

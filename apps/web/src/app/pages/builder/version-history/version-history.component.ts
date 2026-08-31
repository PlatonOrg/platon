import { ChangeDetectionStrategy, ChangeDetectorRef, Component, input, output, inject, OnInit } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzModalService } from 'ng-zorro-antd/modal'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzEmptyModule } from 'ng-zorro-antd/empty'
import { DialogService } from '@platon/core/browser'
import { Resource, FileVersion } from '@platon/feature/resource/common'
import { ResourceFileService, ResourceVersioningComponent } from '@platon/feature/resource/browser'
import { firstValueFrom } from 'rxjs'
import { HttpClient } from '@angular/common/http'

@Component({
  selector: 'app-version-history',
  templateUrl: './version-history.component.html',
  styleUrls: ['./version-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    NzButtonModule,
    NzSpinModule,
    NzEmptyModule,
    ResourceVersioningComponent,
  ],
})
export class VersionHistoryComponent implements OnInit {
  private readonly fileService = inject(ResourceFileService)
  private readonly dialogService = inject(DialogService)
  private readonly modal = inject(NzModalService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly http = inject(HttpClient)

  readonly resource = input.required<Resource>()
  readonly versionChanged = output<{ version: string; overrides: Record<string, unknown> }>()

  protected versions: FileVersion[] = []
  protected loading = false
  protected latest?: FileVersion
  protected currentVersion?: string

  async ngOnInit(): Promise<void> {
    console.log('Chargement des versions pour la ressource:', this.resource())
    await this.loadVersions()
  }

  private async loadVersions(): Promise<void> {
    this.loading = true
    this.changeDetectorRef.markForCheck()

    try {
      const result = await firstValueFrom(this.fileService.versions(this.resource()))
      this.versions = result.all
      this.currentVersion = result.latest?.tag
      this.latest = result.latest ? { ...result.latest, tag: 'latest' } : undefined
      this.versions = this.latest ? [this.latest, ...this.versions] : this.versions
      this.currentVersion = result.latest?.tag
    } catch (_error) {
      this.dialogService.error('Impossible de charger les versions')
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async onVersionCreated(versionName: string): Promise<void> {
    await this.loadVersions()
    this.dialogService.success(`Version "${versionName}" créée avec succès`)
  }

  protected confirmRestoreVersion(version: FileVersion): void {
    this.modal.confirm({
      nzTitle: 'Restaurer cette version ?',
      nzContent: `Êtes-vous sûr de vouloir revenir à la version "${version.tag}" ?<br><br>
        <strong>Note:</strong> Si vous enregistrez cette version, le contenu de la version "latest" sera remplacé.`,
      nzOkText: 'Restaurer',
      nzOkDanger: true,
      nzCancelText: 'Annuler',
      nzOnOk: () => this.restoreVersion(version),
    })
  }

  private async restoreVersion(version: FileVersion): Promise<void> {
    try {
      this.loading = true
      this.changeDetectorRef.markForCheck()

      let overrides: Record<string, unknown> = {}

      try {
        const overridesFile = await firstValueFrom(this.fileService.read(this.resource().id, 'main.plo', version.tag))

        const overridesContent = await firstValueFrom(
          this.http.get<string>(overridesFile.url, { responseType: 'text' as 'json' })
        )

        overrides = JSON.parse(overridesContent)
      } catch (_error) {
        overrides = {}
      }

      this.currentVersion = version.tag

      this.versionChanged.emit({ version: version.tag, overrides })

      this.dialogService.success(`Version "${version.tag}" restaurée avec succès`)
    } catch (_error) {
      this.dialogService.error('Impossible de restaurer cette version')
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected formatDate(date: string | Date): string {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  protected get hasVersions(): boolean {
    return this.versions.length > 0
  }
}

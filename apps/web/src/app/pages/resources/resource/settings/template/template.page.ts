import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzSelectModule } from 'ng-zorro-antd/select'

import { Subscription, firstValueFrom } from 'rxjs'
import { ResourcePresenter } from '../../resource.presenter'
import { NzModalService } from 'ng-zorro-antd/modal'
import { UiFilePreviewComponent } from '@platon/shared/ui'
import { ResourceFileService, ResourceService, ResourceVersionComponent } from '@platon/feature/resource/browser'
import { NzAlertModule } from 'ng-zorro-antd/alert'
import { NzInputModule } from 'ng-zorro-antd/input'
import { MatCardModule } from '@angular/material/card'
import { FileVersion, FileVersions, LATEST, Resource } from '@platon/feature/resource/common'
import { RouterModule } from '@angular/router'

@Component({
  standalone: true,
  selector: 'app-resource-template',
  templateUrl: './template.page.html',
  styleUrls: ['./template.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    UiFilePreviewComponent,
    NzSelectModule,
    FormsModule,
    ResourceVersionComponent,
    NzInputModule,
    NzAlertModule,
    NzButtonModule,
    MatCardModule,
  ],
  providers: [NzModalService],
})
export class ResourceTemplatePage implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription[] = []
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly presenter = inject(ResourcePresenter)
  private readonly resourceFileService = inject(ResourceFileService)
  private readonly resourceService = inject(ResourceService)

  protected context = this.presenter.defaultContext()

  protected templateId!: string
  protected templateVersion!: string
  protected versions!: FileVersions
  protected versionInfo?: FileVersion

  protected template?: Resource

  protected invalidTemplateId = false
  protected errorMessage = ''

  protected get canEdit(): boolean {
    return !!this.context.resource?.permissions?.write
  }

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe((context) => {
        this.context = context
        console.log(this.context)
        this.changeDetectorRef.markForCheck()
      })
    )

    this.templateId = this.context.resource?.templateId || ''
    this.templateVersion = this.context.resource?.templateVersion || ''

    if (this.templateId) {
      await this.updateVersions(this.templateId)
      this.template = await firstValueFrom(this.resourceService.find({ id: this.templateId }))
    }

    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  private updateVersions = async (templateId: string) => {
    this.versions = await firstValueFrom(this.resourceFileService.versions(templateId))
  }

  protected onChangeVersion(version: string) {
    this.versionInfo = this.versions.all.find((v) => v.tag === version)
  }

  protected async onChangeTemplate(templateId: string) {
    this.template = undefined
    if (!this.isUUID4(templateId)) {
      this.invalidTemplateId = true
      this.errorMessage = "Cet ID n'est pas valide"
      this.changeDetectorRef.markForCheck()
    } else {
      try {
        if (!(await firstValueFrom(this.resourceService.isConfigurableExercise(templateId)))) {
          this.invalidTemplateId = true
          this.errorMessage = "Cette ressource n'est pas un exercice configurable"
          this.changeDetectorRef.markForCheck()
          return
        }
      } catch (e) {
        this.invalidTemplateId = true
        this.errorMessage = "Cette ressource n'existe pas"
        this.changeDetectorRef.markForCheck()
        return
      }
      this.template = await firstValueFrom(this.resourceService.find({ id: templateId }))
      await this.updateVersions(templateId)
      this.templateVersion = LATEST
      this.invalidTemplateId = false
      this.changeDetectorRef.markForCheck()
    }
  }

  private isUUID4 = (input: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(input)
  }

  protected async save() {
    if (!this.templateId || !this.templateVersion || this.invalidTemplateId) {
      return
    }
    if (this.context.resource) {
      await firstValueFrom(
        this.resourceService.updateTemplate(this.context.resource.id, this.templateId, this.templateVersion)
      )
    }
  }

  protected openTemplate(): void {
    window.open('/resources/' + this.templateId, '_blank')
  }
}

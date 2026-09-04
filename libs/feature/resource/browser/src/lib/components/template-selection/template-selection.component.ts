import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService, DialogService } from '@platon/core/browser'
import { LATEST, Resource, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { NzTableModule } from 'ng-zorro-antd/table'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { firstValueFrom } from 'rxjs'
import { ResourceService } from '../../api/resource.service'
import { TemplateCardComponent } from '../template-card/template-card.component'
import { User } from '@platon/core/common'
import { createExerciseBuilderDefaultName } from '@platon/feature/builder/browser'

@Component({
  selector: 'resource-template-selection',
  templateUrl: './template-selection.component.html',
  styleUrls: ['./template-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NzIconModule,
    NzTableModule,
    NzButtonModule,
    NzPopconfirmModule,
    MatIconModule,
    MatTooltipModule,
    TemplateCardComponent,
  ],
})
export class TemplateSelectionComponent implements OnInit {
  private readonly resourceService = inject(ResourceService)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly dialogService = inject(DialogService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private user?: User

  protected templates: Resource[] = []

  async ngOnInit(): Promise<void> {
    const [user, templates] = await Promise.all([
      this.authService.ready(),
      firstValueFrom(
        this.resourceService.search({
          types: [ResourceTypes.EXERCISE],
          configurable: true,
          certifiedTemplate: true,
          expands: ['metadata', 'statistic', 'permissions'],
        })
      ),
    ])

    this.templates = templates.resources
    this.user = user || undefined

    this.templates.sort((a, b) => {
      const aRefs = a.statistic?.exercise?.references?.template ?? 0
      const bRefs = b.statistic?.exercise?.references?.template ?? 0
      return bRefs - aRefs
    })

    this.changeDetector.markForCheck()
  }

  private async createQuickResource(template: Resource): Promise<void> {
    if (!this.user) {
      return
    }
    try {
      const personalCircle = await firstValueFrom(this.resourceService.circle(this.user.username))

      const defaultName = createExerciseBuilderDefaultName()

      const resource = await firstValueFrom(
        this.resourceService.create({
          type: ResourceTypes.EXERCISE,
          parentId: personalCircle.id,
          templateId: template.id,
          templateVersion: LATEST,
          name: defaultName,
          desc: 'Exercice créé en mode configuration rapide avec le template : ' + template?.name,
          status: ResourceStatus.DRAFT,
          code: undefined,
          levels: [],
          topics: [],
        })
      )
      await this.router.navigate(['/builder', resource.id])
    } catch (_error) {
      this.dialogService.error('Une erreur est survenue lors de la création de la ressource')

      this.router
        .navigate(['/resources/create'], {
          queryParams: {
            type: ResourceTypes.EXERCISE,
            template: template.id,
          },
          replaceUrl: true,
        })
        .catch(console.error)
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async selectTemplate(template: Resource): Promise<void> {
    console.log(template)
    await this.createQuickResource(template)
  }
}

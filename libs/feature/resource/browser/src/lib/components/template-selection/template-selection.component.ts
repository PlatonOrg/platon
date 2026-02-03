import { CommonModule } from '@angular/common'
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

@Component({
  standalone: true,
  selector: 'resource-template-selection',
  templateUrl: './template-selection.component.html',
  styleUrls: ['./template-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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
    this.templates = (
      await firstValueFrom(
        this.resourceService.search({
          types: [ResourceTypes.EXERCISE],
          configurable: true,
          certifiedTemplate: true,
          expands: ['metadata', 'statistic', 'permissions'],
        })
      )
    ).resources
    this.user = (await this.authService.ready()) as User

    this.changeDetector.markForCheck()
  }

  private async createQuickResource(template: Resource): Promise<void> {
    if (!this.user) {
      return
    }
    try {
      const personalCircle = await firstValueFrom(this.resourceService.circle(this.user.username))

      const timestamp = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const templateName = 'Exercice' // Les noms des templates sont trop longs donc on met un nom générique

      /* IMPORTANT: Ce format est synchronisé avec le regex défini dans
       * builder.page.ts (méthode hasDefaultResourceName).
       * Si le format de génération du nom change, mettre à jour le regex en conséquence.
       */
      const defaultName = `${templateName} - ${timestamp}`

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

      await this.router.navigate(['/builder', resource.id], { replaceUrl: true })
    } catch (error) {
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

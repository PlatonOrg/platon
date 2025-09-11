import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { UserAvatarComponent } from '@platon/core/browser'
import { Resource, ResourceTypes } from '@platon/feature/resource/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { NzTableModule } from 'ng-zorro-antd/table'
import { MatIconModule } from '@angular/material/icon'
import { firstValueFrom } from 'rxjs'
import { ResourceService } from '../../api/resource.service'

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
    UserAvatarComponent,
    MatIconModule,
  ],
})
export class TemplateSelectionComponent implements OnInit {
  private readonly resourceService = inject(ResourceService)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly router = inject(Router)

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

    console.log(this.templates)

    this.changeDetector.markForCheck()
  }

  protected async selectTemplate(templateId: string): Promise<void> {
    // TODO : Use the new resource creation flow
    await this.router.navigate(['/resources/create'], {
      queryParams: {
        type: ResourceTypes.EXERCISE,
        template: templateId,
      },
    })
  }

  protected templateReferences(template: Resource): number {
    return template.statistic?.exercise?.references?.template ?? 0
  }

  protected templateUtilizations(template: Resource): number {
    return template.statistic?.exercise?.references?.referencesAttemptCount ?? 0
  }
}

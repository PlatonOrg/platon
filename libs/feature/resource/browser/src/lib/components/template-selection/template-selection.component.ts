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
import { MatTooltipModule } from '@angular/material/tooltip'
import { firstValueFrom } from 'rxjs'
import { ResourceService } from '../../api/resource.service'
import { TemplateCardComponent } from '../template-card/template-card.component'

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
    MatTooltipModule,
    TemplateCardComponent,
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

    this.changeDetector.markForCheck()
  }

  protected async selectTemplate(templateId: string): Promise<void> {
    await this.router.navigate(['/resources/create'], {
      queryParams: {
        type: ResourceTypes.EXERCISE,
        template: templateId,
        mode: 'configure',
      },
    })
  }
}

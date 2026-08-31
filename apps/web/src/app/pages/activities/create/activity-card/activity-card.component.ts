import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'

import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { NzRibbonComponent } from 'ng-zorro-antd/badge'

import { NgeUiListModule } from '@cisstech/nge/ui/list'
import { Resource } from '@platon/feature/resource/common'
import { ResourcePipesModule } from '@platon/feature/resource/browser'

@Component({
  selector: 'app-activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    NzIconModule,
    NzBadgeModule,
    NzTooltipModule,
    NzRibbonComponent,
    NgeUiListModule,
    ResourcePipesModule,
  ],
})
export class ActivityCardComponent {
  readonly item = input.required<Resource>()
  readonly selected = input<boolean>(false)
  readonly activityClicked = output<Resource>()

  protected handleClick(): void {
    this.activityClicked.emit(this.item())
  }

  protected openTab(url: string): void {
    window.open(url, '_blank')
  }

  get previewUrl(): string {
    return `/player/preview/${this.item().id}`
  }
}

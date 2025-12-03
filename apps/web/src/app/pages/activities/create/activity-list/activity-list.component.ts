import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

import { NzEmptyModule } from 'ng-zorro-antd/empty'

import { Resource } from '@platon/feature/resource/common'
import { ActivityCardComponent } from '../activity-card/activity-card.component'

@Component({
  standalone: true,
  selector: 'app-activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzEmptyModule, ActivityCardComponent],
})
export class ActivityListComponent {
  readonly items = input<Resource[]>([])
  readonly selectedId = input<string | undefined>(undefined)
  readonly activityClicked = output<Resource>()
}

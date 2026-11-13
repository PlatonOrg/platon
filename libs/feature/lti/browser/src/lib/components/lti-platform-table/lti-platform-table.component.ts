import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import { LtiPlatform } from '@platon/feature/lti/common'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzTagModule } from 'ng-zorro-antd/tag'

@Component({
  selector: 'lms-lti-platform-table',
  templateUrl: './lti-platform-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzTableModule, NzTagModule],
})
export class LtiPlatformTableComponent {
  @Input() platforms: LtiPlatform[] = []
  @Input() loading = false
  @Output() openDetails = new EventEmitter<LtiPlatform>()
}

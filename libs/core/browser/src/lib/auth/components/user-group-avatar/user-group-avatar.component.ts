import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import { NzAvatarModule } from 'ng-zorro-antd/avatar'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import { type UserGroup } from '@platon/core/common'
import { NzBadgeModule } from 'ng-zorro-antd/badge'

@Component({
  selector: 'user-group-avatar',
  templateUrl: './user-group-avatar.component.html',
  styleUrls: ['./user-group-avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzBadgeModule, NzAvatarModule, NzTooltipModule],
})
export class UserGroupAvatarComponent {
  @Input() size = 32
  @Input() group!: UserGroup
  @Input() canShowMembers = false
  @Output() showMembers = new EventEmitter()
}

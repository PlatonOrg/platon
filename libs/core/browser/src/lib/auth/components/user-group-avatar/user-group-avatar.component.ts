import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import { NzAvatarModule } from 'ng-zorro-antd/avatar'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

import { UserGroup } from '@platon/core/common'
import { NzBadgeModule } from 'ng-zorro-antd/badge'

@Component({
  standalone: true,
  selector: 'user-group-avatar',
  templateUrl: './user-group-avatar.component.html',
  styleUrls: ['./user-group-avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzBadgeModule, NzAvatarModule, NzToolTipModule],
})
export class UserGroupAvatarComponent {
  @Input() avatarSize = 32
  @Input() group!: UserGroup
  @Input() canShowMembers = false
  @Output() showMembers = new EventEmitter()
}

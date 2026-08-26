import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core'

import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzAvatarModule } from 'ng-zorro-antd/avatar'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

import { User, UserGroup, UserRoles } from '@platon/core/common'
import { firstValueFrom } from 'rxjs'
import { UserService } from '../../api/user.service'
import { UserGroupAvatarComponent } from '../user-group-avatar/user-group-avatar.component'

@Component({
  selector: 'user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrl: './user-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzIconModule, NzBadgeModule, NzAvatarModule, NzToolTipModule, UserGroupAvatarComponent],
})
export class UserAvatarComponent {
  private readonly authUserService = inject(UserService)

  readonly size = input<number>(32)
  readonly noIcon = input(false, { transform: booleanAttribute })
  readonly showUsername = input<'stacked' | 'inline' | 'none'>('stacked')
  readonly lastNameFirst = input(false, { transform: booleanAttribute })
  readonly userIdOrName = input<string>()

  readonly user = input<User | undefined>(undefined)
  private readonly loadedUser = signal<User | undefined>(undefined)
  protected readonly effectiveUser = computed(() => this.user() ?? this.loadedUser())
  readonly group = input<UserGroup | undefined>(undefined)

  protected readonly isAdmin = computed(() => this.effectiveUser()?.role === UserRoles.admin)
  protected readonly avatarUrl = computed(() => {
    const u = this.effectiveUser()
    return u ? `https://robohash.org/${u.username}.png` : undefined
  })

  @Output() readonly openGroupDetails = new EventEmitter<UserGroup>()

  get displayName(): string {
    const u = this.effectiveUser()
    if (u?.firstName && u?.lastName) {
      return this.lastNameFirst() ? `${u.lastName} ${u.firstName}` : `${u.firstName} ${u.lastName}`
    }
    return this.group()?.name || u?.username || ''
  }

  constructor() {
    effect(() => {
      const value = this.userIdOrName()
      if (value) {
        firstValueFrom(this.authUserService.findByIdOrName(value))
          .then((user) => this.loadedUser.set(user))
          .catch(console.error)
      }
    })
  }
}

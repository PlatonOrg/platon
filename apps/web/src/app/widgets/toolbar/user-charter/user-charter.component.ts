import { Component, ChangeDetectionStrategy } from '@angular/core'

import { UserService } from '@platon/core/browser'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { User, UserCharter } from '@platon/core/common'
import { ChangeDetectorRef, EventEmitter, Input, Output } from '@angular/core'
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { inject } from '@angular/core'

@Component({
  selector: 'app-user-charter',
  imports: [NzModalModule],
  templateUrl: './user-charter.component.html',
  styleUrl: './user-charter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserService],
})
export class UserCharterComponent {
  private readonly userService = inject(UserService)

  @Input() user?: User
  @Input() userCharter?: UserCharter
  @Input() userCharterModalVisible = false
  @Output() userCharterModalVisibleChange = new EventEmitter<boolean>()
  @Output() userCharterAccepted = new EventEmitter<UserCharter>()

  private readonly router = inject(Router)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  async showUserCharterModal(): Promise<void> {
    if (!this.userCharter?.acceptedUserCharter) {
      this.userCharterModalVisible = true
      this.changeDetectorRef.markForCheck()
    }
  }

  cancelUserCharter(): void {
    this.userCharterModalVisible = false
    this.userCharterModalVisibleChange.emit(false)
    void this.router.navigate(['/dashboard'])
  }

  async confirmUserCharter(): Promise<void> {
    if (this.user?.id && !this.userCharter?.acceptedUserCharter) {
      try {
        const updatedUserCharter = await firstValueFrom(this.userService.acceptUserCharter(this.user.id))
        if (updatedUserCharter.id) {
          this.userCharter = { ...updatedUserCharter }
          this.userCharterAccepted.emit(this.userCharter)
        }
        this.userCharterModalVisible = false
        this.userCharterModalVisibleChange.emit(false)
        this.changeDetectorRef.markForCheck()
      } catch (_error) {
        /* empty block */
      }
    }
  }
}

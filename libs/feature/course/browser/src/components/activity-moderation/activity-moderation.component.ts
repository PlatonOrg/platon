import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { UserResults } from '@platon/feature/result/common'
import { CommonModule } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { UserAvatarComponent } from '@platon/core/browser'
import { MatCardModule } from '@angular/material/card'
import { ClipboardModule } from '@angular/cdk/clipboard'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatAutocompleteModule } from '@angular/material/autocomplete'

export interface ActivityModerationEvent {
  action: 'open' | 'close'
  selections: Array<{
    userId: string
    sessionId: string
  }>
}

@Component({
  selector: 'course-activity-moderation',
  templateUrl: './activity-moderation.component.html',
  styleUrls: ['./activity-moderation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    UserAvatarComponent,
    MatCardModule,
    ClipboardModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
  ],
})
export class ActivityModerationComponent {
  readonly results = input.required<UserResults[]>()
  readonly code = input<string | undefined>(undefined)

  readonly moderationAction = output<ActivityModerationEvent>()
  readonly regenerateCode = output<void>()

  protected selectedUsers = new Map<string, string>() // Map<userId, sessionId>
  protected isCodeRevealed = false
  protected isCodeCopied = false

  protected readonly searchForm = new FormControl<string | UserResults>('')

  private readonly search = toSignal(this.searchForm.valueChanges, { initialValue: '' as string | UserResults })

  protected readonly filteredUsers = computed<UserResults[]>(() => {
    const value = this.search()
    if (!value) {
      return this.results()
    }
    const filterValue =
      typeof value === 'string' ? value.toLowerCase() : `${value.firstName} ${value.lastName}`.toLowerCase()
    return this._filterUsers(filterValue)
  })

  toggleUserSelection(userId: string, sessionId: string): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId)
    } else {
      this.selectedUsers.set(userId, sessionId)
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers.has(userId)
  }

  clearSelection(): void {
    this.selectedUsers.clear()
  }

  selectAll(): void {
    this.results().forEach((user) => {
      this.selectedUsers.set(user.id, user.activitySessionId)
    })
  }

  getSelectedCount(): number {
    return this.selectedUsers.size
  }

  getTotalCount(): number {
    return this.results().length
  }

  trackByUserId(index: number, user: UserResults): string {
    return user.id
  }

  private getSelections(): Array<{ userId: string; sessionId: string }> {
    return Array.from(this.selectedUsers.entries()).map(([userId, sessionId]) => ({
      userId,
      sessionId,
    }))
  }

  onOpenActivity(): void {
    if (this.selectedUsers.size > 0) {
      this.moderationAction.emit({
        action: 'open',
        selections: this.getSelections(),
      })

      this.clearSelection()
    }
  }

  onCloseActivity(): void {
    if (this.selectedUsers.size > 0) {
      this.moderationAction.emit({
        action: 'close',
        selections: this.getSelections(),
      })
      this.clearSelection()
    }
  }

  toggleCodeVisibility(): void {
    this.isCodeRevealed = !this.isCodeRevealed
  }

  onCodeCopied(): void {
    this.isCodeCopied = true
    setTimeout(() => {
      this.isCodeCopied = false
    }, 1500)
  }

  protected displayFn(user: UserResults): string {
    return user && user.firstName ? user.firstName + ' ' + user.lastName : ''
  }

  private _filterUsers(filterValue: string): UserResults[] {
    return this.results().filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
      return fullName.includes(filterValue)
    })
  }
}

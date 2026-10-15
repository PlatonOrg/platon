import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { firstValueFrom } from 'rxjs'
import { ActivityGroup, UserResults } from '@platon/feature/result/common'

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
import { MatSelectModule } from '@angular/material/select'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { AddTimeDialogComponent } from './add-time-dialog.component'

export type ModerationStatusFilter = 'all' | 'blocked' | 'active' | 'extra' | 'notStarted'

export interface ActivityModerationEvent {
  action: 'open' | 'close' | 'addTime'
  /** Temps à ajouter en secondes (action `addTime` uniquement). */
  seconds?: number
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
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    UserAvatarComponent,
    MatCardModule,
    ClipboardModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatDialogModule,
    ReactiveFormsModule,
  ],
})
export class ActivityModerationComponent {
  private readonly dialog = inject(MatDialog)

  readonly results = input.required<UserResults[]>()
  readonly code = input<string | undefined>(undefined)
  readonly groups = input<ActivityGroup[]>([])

  readonly moderationAction = output<ActivityModerationEvent>()
  readonly regenerateCode = output<void>()

  protected selectedUsers = new Map<string, string>() // Map<userId, sessionId>
  protected isCodeRevealed = false
  protected isCodeCopied = false

  protected readonly searchForm = new FormControl<string | UserResults>('')

  private readonly search = toSignal(this.searchForm.valueChanges, { initialValue: '' as string | UserResults })

  protected readonly statusFilter = signal<ModerationStatusFilter>('all')
  protected readonly groupFilter = signal<string>('')

  protected readonly counts = computed(() => {
    const users = this.results()
    const notStarted = users.filter((u) => !u.activitySessionId).length
    const blocked = users.filter((u) => u.activitySessionId && u.terminated).length
    return {
      total: users.length,
      blocked,
      notStarted,
      active: users.length - blocked - notStarted,
      extra: users.filter((u) => !!u.extraTime).length,
    }
  })

  protected readonly filteredUsers = computed<UserResults[]>(() => {
    const value = this.search()
    const status = this.statusFilter()
    const group = this.groupFilter()
    const text = !value
      ? ''
      : (typeof value === 'string' ? value : `${value.firstName} ${value.lastName}`).toLowerCase()

    return this.results().filter((user) => {
      if (text && !`${user.firstName} ${user.lastName}`.toLowerCase().includes(text)) return false
      if (group && !user.groupIds?.includes(group)) return false
      switch (status) {
        case 'blocked':
          return !!user.activitySessionId && !!user.terminated
        case 'active':
          return !!user.activitySessionId && !user.terminated
        case 'notStarted':
          return !user.activitySessionId
        case 'extra':
          return !!user.extraTime
        default:
          return true
      }
    })
  })

  protected formatExtraTime(seconds?: number): string {
    return seconds ? `+${Math.round(seconds / 60)} min` : ''
  }

  toggleUserSelection(userId: string, sessionId: string): void {
    // Un élève qui n'a pas lancé l'activité n'a pas de session : aucune action possible.
    if (!sessionId) return
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
    this.filteredUsers()
      .filter((user) => user.activitySessionId)
      .forEach((user) => {
        this.selectedUsers.set(user.id, user.activitySessionId)
      })
  }

  isAllFilteredSelected(): boolean {
    const users = this.filteredUsers().filter((user) => user.activitySessionId)
    return users.length === 0 || users.every((user) => this.selectedUsers.has(user.id))
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

  async onAddTime(): Promise<void> {
    if (this.selectedUsers.size === 0) return
    const names = this.results()
      .filter((user) => this.selectedUsers.has(user.id))
      .map((user) => `${user.firstName} ${user.lastName}`)

    const seconds = await firstValueFrom(
      this.dialog.open<AddTimeDialogComponent, { names: string[] }, number>(AddTimeDialogComponent, {
        data: { names },
        width: '420px',
        autoFocus: false,
      }).afterClosed()
    )
    if (!seconds) return

    this.moderationAction.emit({
      action: 'addTime',
      seconds,
      selections: this.getSelections(),
    })
    this.clearSelection()
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
}

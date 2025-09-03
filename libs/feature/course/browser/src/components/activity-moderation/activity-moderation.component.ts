import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core'
import { UserResults } from '@platon/feature/result/common'
import { CommonModule } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { UserAvatarComponent } from '@platon/core/browser'
import { MatCardModule } from '@angular/material/card'

export interface ActivityModerationEvent {
  action: 'open' | 'close'
  selections: Array<{
    userId: string
    sessionId: string
  }>
}

@Component({
  standalone: true,
  selector: 'course-activity-moderation',
  templateUrl: './activity-moderation.component.html',
  styleUrls: ['./activity-moderation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, UserAvatarComponent, MatCardModule],
})
export class ActivityModerationComponent {
  @Input({ required: true }) results: UserResults[] = []
  @Input() code?: string

  @Output() moderationAction = new EventEmitter<ActivityModerationEvent>()

  protected selectedUsers = new Map<string, string>() // Map<userId, sessionId>
  protected isCodeRevealed = false

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
    this.results.forEach((user) => {
      this.selectedUsers.set(user.id, user.activitySessionId)
    })
  }

  getSelectedCount(): number {
    return this.selectedUsers.size
  }

  getTotalCount(): number {
    return this.results.length
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
}

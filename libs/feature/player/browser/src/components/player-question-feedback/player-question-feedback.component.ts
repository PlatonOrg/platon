import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { MatIconModule } from '@angular/material/icon'
import { Feedback, FEEDBACK_CATEGORIES, FeedbackCategoryValue } from '@platon/feature/player/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { PlayerService } from '../../api/player.service'
import { firstValueFrom } from 'rxjs'

@Component({
  selector: 'player-question-feedback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, NzButtonModule, NzInputModule, NzSelectModule],
  templateUrl: './player-question-feedback.component.html',
  styleUrl: './player-question-feedback.component.scss',
})
export class PlayerQuestionFeedbackComponent {
  sessionId = input<string | undefined>(undefined)
  exerciseTitle = input<string | undefined>(undefined)
  author = input<string | null | undefined>(undefined)

  constructor(private readonly playerService: PlayerService) {}

  protected readonly maxLength = 10000

  protected readonly categories = FEEDBACK_CATEGORIES

  protected readonly expanded = signal(false)
  protected readonly submitted = signal(false)

  protected category = signal<FeedbackCategoryValue | null>(null)
  protected readonly message = signal('')

  protected toggle(): void {
    if (this.expanded()) {
      this.close()
      return
    }
    this.expanded.set(true)
  }

  protected onCategoryChange(): void {
    this.message.set('')
  }

  protected async submit(): Promise<void> {
    if (!this.category() || !this.message().trim()) {
      return
    }
    const payload = {
      sessionId: this.sessionId(),
      exerciseTitle: this.exerciseTitle(),
      author: this.author(),
      category: this.category(),
      message: this.message(),
    } as Feedback
    try {
      await firstValueFrom(this.playerService.submitFeedback(payload))
      this.submitted.set(true)
    } catch (error) {
      console.error("Erreur lors de l'envoi du feedback :", error)
    }
  }

  protected close(): void {
    this.expanded.set(false)
    this.submitted.set(false)
    this.category.set(null)
    this.message.set('')
  }
}

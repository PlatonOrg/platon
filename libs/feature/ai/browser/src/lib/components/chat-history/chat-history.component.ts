import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AiChat } from '@platon/feature/ai/common'
import { Router } from '@angular/router'

@Component({
  selector: 'ai-chat-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-history.component.html',
  styleUrl: './chat-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHistoryComponent implements OnInit {
  private readonly router = inject(Router)
  @Input() chats: AiChat[] = []

  ngOnInit(): void {
    this.chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  async onSelectChat(chat: AiChat): Promise<void> {
    console.error('Navigating to chat:', chat)
    await this.router.navigate([`/ai/c/${chat.id}`])
  }

  formatDate(date: string | Date): string {
    const chatDate = new Date(date)
    const now = new Date()
    const diffInHours = (now.getTime() - chatDate.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return chatDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (diffInHours < 24 * 7) {
      return chatDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
      })
    } else {
      return chatDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      })
    }
  }
}

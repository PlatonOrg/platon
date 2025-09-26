import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { AuthService, UserAvatarComponent } from '@platon/core/browser'
import { User } from '@platon/core/common'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'
import { ChatMessage, TypingAnimationController } from '../../models/chat-message.interface'
import { AiChat } from '@platon/feature/ai/common'
import { ChatHistoryComponent } from '../chat-history/chat-history.component'

@Component({
  selector: 'ai-main-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    NgeMarkdownModule,
    UserAvatarComponent,
    ChatHistoryComponent,
  ],
  templateUrl: './main-chat.component.html',
  styleUrl: './main-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainChatComponent implements OnInit, OnChanges, AfterViewInit, TypingAnimationController {
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>

  private readonly cdr = inject(ChangeDetectorRef)
  private readonly typingTimeouts = new Map<string, NodeJS.Timeout>()

  @Input() messages: ChatMessage[] = []
  @Input() user?: User
  @Input() chatTitle?: string
  @Input() isTyping = false
  @Input() chats: AiChat[] = []

  @Output() sendMessage = new EventEmitter<string>()
  @Output() startNewChat = new EventEmitter<void>()

  currentMessage = ''
  isTransitioning = false

  constructor(private readonly authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    if (!this.user) {
      this.user = (await this.authService.ready()) as User
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this.messages = [...this.messages]
      this.processStreamingMessages()
      this.cdr.markForCheck()
    }
  }

  async ngAfterViewInit(): Promise<void> {
    this.adjustTextareaHeight()
    setTimeout(() => this.scrollToBottom(), 1000)
  }

  private processStreamingMessages(): void {
    this.messages.forEach((message) => {
      if (message.type === 'ai' && message.isStreaming) {
        this.animateTyping(message)
      } else if (message.type === 'ai' && !message.displayText) {
        message.displayText = message.text
      }
    })
  }

  private animateTyping(message: ChatMessage): void {
    const existingTimeout = this.typingTimeouts.get(message.id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const fullText = message.text
    const currentDisplayText = message.displayText || ''

    if (currentDisplayText.length < fullText.length) {
      message.displayText = fullText.substring(0, currentDisplayText.length + 1)

      const timeout = setTimeout(() => {
        this.animateTyping(message)
        this.cdr.markForCheck()
        this.scrollToBottom()
      }, 7)

      this.typingTimeouts.set(message.id, timeout)
    } else {
      message.isStreaming = false
      message.displayText = fullText
      this.typingTimeouts.delete(message.id)
    }
  }

  // Method to be called when receiving a new chunk
  updateMessageChunk(messageId: string, newText: string): void {
    const message = this.messages.find((m) => m.id === messageId)
    if (message) {
      message.text = newText
      message.isStreaming = true

      if (!message.displayText) {
        message.displayText = ''
        this.animateTyping(message)
      }

      this.cdr.markForCheck()
    }
  }

  completeMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId)
    if (message) {
      message.isStreaming = false
      const timeout = this.typingTimeouts.get(messageId)
      if (timeout) {
        clearTimeout(timeout)
        this.typingTimeouts.delete(messageId)
      }
      message.displayText = message.text
      this.cdr.markForCheck()
    }
  }

  newChat() {
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout))
    this.typingTimeouts.clear()

    this.currentMessage = ''
    this.adjustTextareaHeight()
    this.startNewChat.emit()
  }

  async onSendMessage() {
    if (!this.currentMessage.trim() || this.isTyping) return

    // Start transition animation if this is the first message
    if (this.messages.length === 0) {
      this.isTransitioning = true
      setTimeout(() => {
        this.isTransitioning = false
      }, 600)
    }

    const messageText = this.currentMessage.trim()
    this.currentMessage = ''
    this.adjustTextareaHeight()

    // Emit message to parent
    this.sendMessage.emit(messageText)
  }

  async onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      await this.onSendMessage()
    }

    setTimeout(() => this.adjustTextareaHeight(), 0)
  }

  private adjustTextareaHeight() {
    const textarea = this.messageInput?.nativeElement
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        })
      }
    }, 1000)
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

export interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  text: string
  timestamp: Date
  isStreaming?: boolean
  displayText?: string
}

export interface TypingAnimationController {
  updateMessageChunk(messageId: string, newText: string): void
  completeMessage(messageId: string): void
}

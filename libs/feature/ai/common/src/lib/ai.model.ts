export interface OrchestratorContext {
  userId?: string
  chatId?: string
}

export interface OrchestratorOutput {
  response: string
  metadata: {
    processingTime: number
    tokensUsed: number
    confidence: number
    source: 'ai' | 'cache' | 'template'
  }
  suggestions?: string[]
  relatedTopics?: string[]
}

export interface StreamChunk {
  type: 'start' | 'chunk' | 'end' | 'error'
  sessionId: string
  content?: string
  chunkIndex?: number
  metadata?: Partial<OrchestratorOutput['metadata']>
  suggestions?: string[]
  relatedTopics?: string[]
  error?: string
  timestamp: string
}

export interface StreamingResponse {
  sessionId: string
  chatId: string
  messageId?: string
}

export interface AiMetadata {
  source: string
  chunkIndex: number
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface AiChat {
  id: string
  userId: string
  createdAt: Date
  updatedAt: Date
  messages?: AiChatMessage[]
  title: string
}

export enum AiTool {
  DOCUMENTATION = 'doc',
  EXERCISE_GENERATION = 'create',
  OTHER = 'other',
}

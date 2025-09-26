import { Injectable, Logger } from '@nestjs/common'
import { OrchestratorOutput, OrchestratorContext, StreamChunk, AiChat, AiTool } from '@platon/feature/ai/common'
import { AiService } from './ai.service'
import { AiChatService } from './chat/ai-chat.service'

interface OrchestratorInput {
  chat: AiChat
  prompt: string
}

interface ProcessingPreferences {
  format?: 'markdown' | 'html' | 'plain'
  maxTokens?: number
  language?: string
}

export interface ProcessingResult {
  response: string
  title?: string
  metadata?: OrchestratorOutput['metadata']
  suggestions: string[]
  relatedTopics: string[]
}

/**
 * AI Orchestrator - Implements the orchestrator pattern for AI request processing
 */
@Injectable()
export class AiOrchestrator {
  private readonly logger = new Logger(AiOrchestrator.name)

  constructor(private readonly aiService: AiService, private readonly aiChatService: AiChatService) {}

  /**
   * Main orchestration method with streaming support
   */
  public async *orchestrateStream(
    input: OrchestratorInput,
    onComplete?: (response: ProcessingResult) => Promise<void>
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const sessionId = this.generateSessionId()
    const startTime = Date.now()

    this.logger.log(`🚀 Starting orchestration [${sessionId}] for prompt: ${this.truncatePrompt(input.prompt)}`)

    yield this.createStartChunk(sessionId)

    try {
      // Execute orchestration pipeline
      const result = yield* this.executeOrchestrationPipeline(input, sessionId, startTime)

      // Execute completion callback
      if (onComplete) {
        await onComplete(result)
      }

      yield this.createEndChunk(sessionId, result)
    } catch (error) {
      this.logger.error(`❌ Orchestration failed [${sessionId}]:`, error)
      yield this.createErrorChunk(sessionId, error)
    }
  }

  /**
   * Execute the full orchestration pipeline
   */
  private async *executeOrchestrationPipeline(
    input: OrchestratorInput,
    sessionId: string,
    startTime: number
  ): AsyncGenerator<StreamChunk, ProcessingResult, unknown> {
    // Step 1: Input validation and preprocessing
    await this.validateInput(input)
    const { prompt: processedPrompt, tool } = await this.preprocessPrompt(input.prompt)

    // Step 2: Generate AI response with streaming
    const { response, tokensUsed } = yield* this.streamAIResponse(processedPrompt, tool, sessionId)

    // Step 3: Generate title based on prompt and response
    if (!input.chat.title || input.chat.title === 'Nouvelle conversation') {
      input.chat.title = (await this.generateTitle(input.prompt, response)) || input.chat.title
      await this.aiChatService.updateChat(input.chat.id, input.chat.title)
    }
    // Step 4: Post-processing
    const finalResponse = await this.postprocessResponse(response)

    return this.createFinalResult(finalResponse, input.chat.title, startTime, tokensUsed)
  }

  /**
   * Stream AI response generation
   */
  private async *streamAIResponse(
    prompt: string,
    tool: AiTool,
    sessionId: string
  ): AsyncGenerator<StreamChunk, { response: string; tokensUsed: number }, unknown> {
    let fullResponse = ''
    let chunkIndex = 0
    let tokensUsed = 0

    this.logger.log('🤖 Generating AI response...')

    try {
      const aiResponseStream = this.aiService.generate(prompt, tool)

      for await (const chunk of aiResponseStream) {
        fullResponse += chunk
        tokensUsed += this.estimateTokens(chunk)

        yield this.createChunk(sessionId, chunk, chunkIndex++)
      }

      return { response: fullResponse, tokensUsed }
    } catch (error) {
      this.logger.error('❌ AI generation failed:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  /**
   * Input validation
   */
  private async validateInput(input: OrchestratorInput): Promise<void> {
    if (!input.prompt?.trim()) {
      throw new Error('Prompt is required and cannot be empty')
    }

    if (input.prompt.length > 4000) {
      throw new Error('Prompt exceeds maximum length (4000 characters)')
    }
  }

  /**
   * Prompt preprocessing with tool routing
   */
  private async preprocessPrompt(
    prompt: string,
    _context?: OrchestratorContext
  ): Promise<{ prompt: string; tool: AiTool }> {
    const processedPrompt = this.sanitizePrompt(prompt)
    let tool: AiTool = AiTool.OTHER
    try {
      tool = await this.aiService.generateTool(processedPrompt)
      this.logger.debug(`🔧 Tool routing: ${tool}`)
    } catch (error) {
      this.logger.warn('⚠️ Tool routing failed, using default processing:', error)
    }

    return { prompt: processedPrompt, tool: tool || AiTool.OTHER }
  }

  /**
   * Response post-processing and formatting
   */
  private async postprocessResponse(response: string, preferences?: ProcessingPreferences): Promise<string> {
    if (!preferences) return response

    let processedResponse = response

    // Length limitation
    if (preferences.maxTokens) {
      const maxChars = preferences.maxTokens * 4 // Token approximation
      if (processedResponse.length > maxChars) {
        processedResponse = processedResponse.substring(0, maxChars) + '...'
      }
    }

    return processedResponse
  }

  /**
   * Generate a title based on the prompt and response using AI
   */
  private async generateTitle(prompt: string, response: string): Promise<string> {
    try {
      this.logger.debug('🎯 Generating title for conversation')

      // Create a focused prompt for title generation
      const titlePrompt = `Basé sur cette question: "${this.truncatePrompt(
        prompt
      )}" et cette réponse (début): "${response.substring(
        0,
        200
      )}...", génère un titre court et pertinent pour cette conversation. Réponds uniquement par le titre, sans guillemets ni explication.`

      let generatedTitle = ''
      const titleStream = this.aiService.generate(titlePrompt)

      // Collect the full title from the stream
      for await (const chunk of titleStream) {
        generatedTitle += chunk
      }

      // Clean and validate the generated title
      const cleanTitle = this.sanitizeTitle(generatedTitle.trim())

      if (cleanTitle.length > 0 && cleanTitle.length <= 100) {
        return cleanTitle
      } else {
        return this.generateFallbackTitle(prompt)
      }
    } catch (error) {
      this.logger.warn('⚠️ Title generation failed, using fallback:', error)
      return this.generateFallbackTitle(prompt)
    }
  }

  /**
   * Generate a fallback title based on prompt keywords
   */
  private generateFallbackTitle(prompt: string): string {
    const words = prompt.trim().split(/\s+/).slice(0, 8) // Take first 8 words
    const title = words.join(' ')

    if (title.length > 60) {
      return title.substring(0, 57) + '...'
    }

    return title || 'Nouvelle conversation'
  }

  /**
   * Sanitize and format the generated title
   */
  private sanitizeTitle(title: string): string {
    return title
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
  }

  /**
   * Stream chunk creation helpers
   */
  private createStartChunk(sessionId: string): StreamChunk {
    return {
      type: 'start',
      sessionId,
      timestamp: new Date().toISOString(),
    }
  }

  private createChunk(sessionId: string, content: string, chunkIndex: number): StreamChunk {
    return {
      type: 'chunk',
      sessionId,
      content,
      chunkIndex,
      timestamp: new Date().toISOString(),
    }
  }

  private createEndChunk(sessionId: string, result: ProcessingResult): StreamChunk {
    return {
      type: 'end',
      sessionId,
      metadata: result.metadata,
      suggestions: result.suggestions,
      relatedTopics: result.relatedTopics,
      timestamp: new Date().toISOString(),
    }
  }

  private createErrorChunk(sessionId: string, error: unknown): StreamChunk {
    return {
      type: 'error',
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Utility and helper methods
   */
  private generateSessionId(): string {
    return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private truncatePrompt(prompt: string): string {
    return prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt
  }

  private sanitizePrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\w\s.,;:!?'"()-]/g, '') // Remove special characters
  }

  private estimateTokens(text: string): number {
    // Simple token estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  private createFinalResult(
    response: string,
    title: string | undefined,
    startTime: number,
    tokensUsed: number
  ): ProcessingResult {
    const endTime = Date.now()
    const processingTime = endTime - startTime

    this.logger.log(
      `✅ Orchestration completed in ${processingTime}ms, tokens used: ${tokensUsed}, title: "${title || 'N/A'}"`
    )

    return {
      response,
      title,
      suggestions: [], // Placeholder for future implementation
      relatedTopics: [], // Placeholder for future implementation
    }
  }
}

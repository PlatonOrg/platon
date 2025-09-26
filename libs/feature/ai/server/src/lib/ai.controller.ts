import { Controller, Get, Post, Req, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ErrorResponse, UserRoles } from '@platon/core/common'
import { Roles, IRequest } from '@platon/core/server'
import { AiOrchestrator } from './ai.orchestrator'
import { AiChat, StreamChunk } from '@platon/feature/ai/common'
import { AiChatService } from './chat/ai-chat.service'
import { Response } from 'express'
import { ProcessingResult } from './ai.orchestrator'

@ApiBearerAuth()
@Controller('ai')
@ApiTags('AI')
export class AiController {
  constructor(private readonly aiOrchestrator: AiOrchestrator, private readonly aiChatService: AiChatService) {}

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('/create-chat')
  async createChat(@Req() req: IRequest): Promise<AiChat> {
    const userId = req.user.id
    const chat = await this.aiChatService.createChat(userId)
    return chat
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('/chats/me')
  async getUserChats(@Req() req: IRequest): Promise<AiChat[]> {
    const userId = req.user.id
    return await this.aiChatService.getUserChats(userId)
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Post('/ask/:chatId/stream')
  async askStream(@Req() req: IRequest, @Res() res: Response): Promise<void> {
    const chatId = req.params['chatId']
    const userId = req.user.id
    const { prompt } = req.body

    if (!prompt?.trim()) {
      throw new ErrorResponse({ status: 400, message: 'Prompt is required' })
    }

    const [chat, _] = await Promise.all([
      this.aiChatService.getChat(userId, chatId),
      this.aiChatService.addMessage(chatId, {
        role: 'user',
        content: prompt,
      }),
    ])

    this.setupStreamingHeaders(res)

    try {
      const saveCompleteMessage = async (response: ProcessingResult) => {
        try {
          await this.aiChatService.addMessage(chatId, {
            role: 'ai',
            content: response.response,
          })
        } catch (error) {
          console.error('Erreur lors de la sauvegarde du message:', error)
        }
      }

      const streamGenerator = this.aiOrchestrator.orchestrateStream(
        {
          chat,
          prompt,
        },
        saveCompleteMessage
      )

      // Streaming des chunks
      for await (const chunk of streamGenerator) {
        res.write(JSON.stringify(chunk) + '\n')
      }

      res.end()
    } catch (error) {
      this.handleStreamingError(res, error)
    }
  }

  @Roles(UserRoles.admin, UserRoles.teacher)
  @Get('chats/:chatId/messages')
  async getChatMessages(@Req() req: IRequest): Promise<AiChat> {
    const chatId = req.params['chatId']
    return await this.aiChatService.getChat(req.user.id, chatId)
  }

  /**
   * Configure les headers HTTP pour le streaming
   */
  private setupStreamingHeaders(res: Response): void {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control')
  }

  /**
   * Gère les erreurs de streaming
   */
  private handleStreamingError(res: Response, error: unknown): void {
    const errorChunk: StreamChunk = {
      type: 'error',
      sessionId: 'error',
      error: error instanceof Error ? error.message : 'Une erreur est survenue lors du traitement de votre demande.',
      timestamp: new Date().toISOString(),
    }

    if (!res.headersSent) {
      res.status(500)
    }

    res.write(JSON.stringify(errorChunk) + '\n')
    res.end()
  }
}

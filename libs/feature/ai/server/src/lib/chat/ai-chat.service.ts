import { Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { AiChatEntity } from './ai-chat.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { AiMessageEntity } from './ai-message.entity'
import { ErrorResponse } from '@platon/core/common'

@Injectable()
export class AiChatService {
  constructor(
    @InjectRepository(AiChatEntity)
    private readonly chatRepository: Repository<AiChatEntity>,
    @InjectRepository(AiMessageEntity)
    private readonly messageRepository: Repository<AiMessageEntity>
  ) {}

  async createChat(userId: string): Promise<AiChatEntity> {
    const chat = this.chatRepository.create({ userId, title: 'Nouvelle conversation' })
    return this.chatRepository.save(chat)
  }

  async getUserChats(userId: string): Promise<AiChatEntity[]> {
    return this.chatRepository.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }

  async getChat(userId: string, chatId: string): Promise<AiChatEntity> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId, userId }, relations: ['messages'] })
    if (!chat) {
      throw new ErrorResponse({ status: 404, message: 'Chat not found' })
    }
    return chat
  }

  async updateChat(chatId: string, title: string): Promise<AiChatEntity> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } })
    if (!chat) {
      throw new ErrorResponse({ status: 404, message: 'Chat not found' })
    }
    chat.title = title
    return this.chatRepository.save(chat)
  }

  async addMessage(chatId: string, messageData: { role: 'user' | 'ai'; content: string }): Promise<AiMessageEntity> {
    const message = this.messageRepository.create({
      chatId,
      role: messageData.role,
      content: messageData.content,
    })
    return this.messageRepository.save(message)
  }
}

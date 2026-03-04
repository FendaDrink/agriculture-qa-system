import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import { ChatMessageEntity } from '../entities/chatMessage.entity'
import { ChatMessageDto } from '../dto/chatMessage.dto'

@Injectable()
export class ChatMessageDAO {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private chatMessageRepository: Repository<ChatMessageEntity>, // 注入 Repository
  ) {}

  /**
   * 查找某个会话下所有的聊天记录
   */
  async findAllMessages(sessionId: string): Promise<ChatMessageDto[]> {
    return this.chatMessageRepository.find({
      where: {
        sessionId,
        status: In([0, 1]),
      },
    })
  }

  /**
   * 查找某个聊天记录
   */
  async findOneChatMessage(messageId: string): Promise<ChatMessageDto> {
    return this.chatMessageRepository.findOne({
      where: {
        id: messageId,
      },
    })
  }

  /**
   * 创建新的会话
   * @param chatMessageDto
   * @param manager
   */
  async createChatMessage(
    chatMessageDto: Partial<ChatMessageDto>,
    manager: EntityManager,
  ): Promise<ChatMessageDto> {
    const chatSessionEntity = manager.create(ChatMessageEntity, chatMessageDto) // 创建 ChatMessage 实体
    return manager.save(chatSessionEntity) //保存至数据库中
  }

  /**
   * 更新指定 messageId 的 message 记录
   * @param chatMessage
   * @param manager
   */
  async updateChatMessage(
    chatMessage: Partial<ChatMessageDto>,
    manager: EntityManager,
  ): Promise<ChatMessageDto> {
    const newChatMessage = await manager.preload(ChatMessageEntity, chatMessage) // 更新 message
    return manager.save(newChatMessage as ChatMessageDto)
  }

  /**
   * 根据指定 messageId 删除 message
   * @param id
   * @param manager
   */
  async deleteChatMessage(id: string, manager: EntityManager): Promise<void> {
    await manager.delete(ChatMessageEntity, id)
  }

  toChatMessageDto(chatMessage: ChatMessageEntity): ChatMessageDto {
    return {
      ...chatMessage,
    }
  }
}

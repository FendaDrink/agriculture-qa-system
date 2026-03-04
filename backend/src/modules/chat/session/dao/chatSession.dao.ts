import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { ChatSessionEntity } from '../entities/chatSession.entity'
import { ChatSessionDto } from '../dto/chatSession.dto'

@Injectable()
export class ChatSessionDAO {
  constructor(
    @InjectRepository(ChatSessionEntity)
    private chatSessionRepository: Repository<ChatSessionEntity>, // 注入 Repository
  ) {}

  /**
   * 查找所有的会话记录
   */
  async findAllSessions(): Promise<ChatSessionDto[]> {
    return this.chatSessionRepository.find()
  }

  /**
   * 查找某个用户下的所有会话记录
   */
  async findAllSessionsByUser(userId: string): Promise<ChatSessionDto[]> {
    return this.chatSessionRepository.find({
      where: {
        createBy: userId,
      },
    })
  }

  /**
   * 查找某个 chatSession
   */
  async findOneSession(id: string): Promise<ChatSessionDto> {
    return this.chatSessionRepository.findOne({ where: { id } })
  }

  /**
   * 创建新的会话
   * @param chatSessionDto
   * @param manager
   */
  async createChatSession(
    chatSessionDto: Partial<ChatSessionDto>,
    manager: EntityManager,
  ): Promise<ChatSessionDto> {
    const chatSessionEntity = manager.create(ChatSessionEntity, chatSessionDto) // 创建 ChatSession 实体
    return manager.save(chatSessionEntity) //保存至数据库中
  }

  /**
   * 更新指定sessionId的chatSession记录
   * @param chatSession
   * @param manager
   */
  async updateChatSession(
    chatSession: Partial<ChatSessionDto>,
    manager: EntityManager,
  ): Promise<ChatSessionDto> {
    const newChatSession = await manager.preload(ChatSessionEntity, chatSession) // 更新用户
    return manager.save(newChatSession as ChatSessionDto)
  }

  /**
   * 根据指定 sessionId 删除 chatSession
   * @param id
   * @param manager
   */
  async deleteChatSession(id: string, manager: EntityManager): Promise<void> {
    await manager.delete(ChatSessionEntity, id)
  }

  toChatSessionDto(chatSession: ChatSessionEntity): ChatSessionDto {
    return {
      ...chatSession,
    }
  }
}

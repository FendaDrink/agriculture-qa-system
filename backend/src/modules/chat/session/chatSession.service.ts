import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ChatSessionDto } from './dto/chatSession.dto'
import { ChatSessionDAO } from './dao/chatSession.dao'
import { CreateChatSessionDto } from './dto/createChatSession.dto'
import { v4 as uuidV4 } from 'uuid'
import { UpdateChatSessionDto } from './dto/updateChatSession.dto'

@Injectable()
export class ChatSessionService {
  constructor(
    private readonly dataSource: DataSource,
    private chatSessionDAO: ChatSessionDAO, // 注入 ChatSessionDao
  ) {}

  /**
   * 获取所有 chatSession
   */
  async findAllChatSessions(): Promise<ChatSessionDto[]> {
    return this.chatSessionDAO.findAllSessions()
  }

  /**
   * 获取某个用户下所有的 chatSessions
   */
  async findAllChatSessionsByUserId(userId: string): Promise<ChatSessionDto[]> {
    return this.chatSessionDAO.findAllSessionsByUser(userId)
  }

  /**
   * 创建新的会话
   */
  async createChatSession(chatSessionData: CreateChatSessionDto): Promise<ChatSessionDto> {
    return this.dataSource.transaction(async (manager) => {
      const id = uuidV4()
      const newChatSessionData = {
        ...chatSessionData,
        id,
        status: 1,
      }
      return await this.chatSessionDAO.createChatSession(newChatSessionData, manager)
    })
  }

  /**
   * 根据 sessionId 修改某个会话
   */
  async updateChatSession(chatSessionData: UpdateChatSessionDto): Promise<ChatSessionDto> {
    return this.dataSource.transaction(async (manager) => {
      const id = chatSessionData.id
      const oldChatSession = await this.chatSessionDAO.findOneSession(id)
      if (!oldChatSession) {
        throw new HttpException('该会话不存在', HttpStatus.NOT_FOUND)
      }
      const chatSession = {
        ...oldChatSession,
        ...chatSessionData,
      }
      return this.chatSessionDAO.updateChatSession(chatSession, manager)
    })
  }

  /**
   * 删除某个 chatSession
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const chatSession = await this.chatSessionDAO.findOneSession(sessionId)
      if (!chatSession) {
        throw new HttpException('该会话不存在', HttpStatus.NOT_FOUND)
      }
      await this.chatSessionDAO.deleteChatSession(sessionId, manager)
    })
  }
}

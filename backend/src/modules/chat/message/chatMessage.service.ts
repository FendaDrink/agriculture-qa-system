import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ChatMessageDto } from './dto/chatMessage.dto'
import { CreateChatMessageDto } from './dto/createChatMessage.dto'
import { v6 as uuidV6 } from 'uuid'
import { UpdateChatMessageDto } from './dto/updateChatMessage.dto'
import { ChatMessageDAO } from './dao/chatMessage.dao'

@Injectable()
export class ChatMessageService {
  constructor(
    private readonly dataSource: DataSource,
    private chatMessageDAO: ChatMessageDAO, // 注入 ChatMessageDAO
  ) {}

  /**
   * 获取某一 sessionId 下所有 message
   */
  async findAllChatMessage(sessionId: string): Promise<ChatMessageDto[]> {
    return this.chatMessageDAO.findAllMessages(sessionId)
  }

  /**
   * 创建新的 message
   */
  async createChatMessage(chatMessageData: CreateChatMessageDto): Promise<ChatMessageDto> {
    return this.dataSource.transaction(async (manager) => {
      const id = uuidV6()
      const newChatMessageData = {
        ...chatMessageData,
        id,
        status: 1,
      }
      return await this.chatMessageDAO.createChatMessage(newChatMessageData, manager)
    })
  }

  /**
   * 根据 messageId 修改某个 message
   */
  async updateChatMessage(chatMessageData: UpdateChatMessageDto): Promise<ChatMessageDto> {
    return this.dataSource.transaction(async (manager) => {
      const id = chatMessageData.id
      const oldChatMessage = await this.chatMessageDAO.findOneChatMessage(id)
      if (!oldChatMessage) {
        throw new HttpException('该消息不存在', HttpStatus.NOT_FOUND)
      }
      const chatMessage = {
        ...oldChatMessage,
        ...chatMessageData,
      }
      return this.chatMessageDAO.updateChatMessage(chatMessage, manager)
    })
  }

  /**
   * 删除某个 chatMessage
   */
  async deleteChatMessage(messageId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const chatMessage = await this.chatMessageDAO.findOneChatMessage(messageId)
      if (!chatMessage) {
        throw new HttpException('该消息不存在', HttpStatus.NOT_FOUND)
      }
      await this.chatMessageDAO.deleteChatMessage(messageId, manager)
    })
  }
}

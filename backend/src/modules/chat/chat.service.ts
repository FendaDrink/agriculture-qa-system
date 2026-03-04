import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ChatSessionDAO } from './session/dao/chatSession.dao'

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private chatSessionDAO: ChatSessionDAO, // 注入 ChatSessionDao
  ) {}
}

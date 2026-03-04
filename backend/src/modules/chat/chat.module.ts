import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import ChatController from './chat.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { ChatSessionDAO } from './session/dao/chatSession.dao'
import { ChatSessionModule } from './session/chatSession.module'
import { ChatSessionEntity } from './session/entities/chatSession.entity'
import { ChatMessageEntity } from './message/entities/chatMessage.entity'
import { ChatMessageModule } from './message/chatMessage.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity]),
    AuthModule,
    ChatSessionModule,
    ChatMessageModule,
  ],
  providers: [ChatService, ChatSessionDAO],
  controllers: [ChatController],
})
export class ChatModule {}

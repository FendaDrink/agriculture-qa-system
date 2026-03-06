import { Module } from '@nestjs/common'
import { ChatMessageService } from './chatMessage.service'
import ChatController from './chatMessage.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../../auth/auth.module'
import { ChatMessageEntity } from './entities/chatMessage.entity'
import { ChatMessageDAO } from './dao/chatMessage.dao'

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageEntity]), AuthModule],
  providers: [ChatMessageService, ChatMessageDAO],
  controllers: [ChatController],
})
export class ChatMessageModule {}

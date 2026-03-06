import { Module } from '@nestjs/common'
import { ChatSessionService } from './chatSession.service'
import ChatSessionController from './chatSession.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../../auth/auth.module'
import { ChatSessionEntity } from './entities/chatSession.entity'
import { ChatSessionDAO } from './dao/chatSession.dao'

@Module({
  imports: [TypeOrmModule.forFeature([ChatSessionEntity]), AuthModule],
  providers: [ChatSessionService, ChatSessionDAO],
  controllers: [ChatSessionController],
})
export class ChatSessionModule {}

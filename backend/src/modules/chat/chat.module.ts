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
import { ExternalApiService } from '../../common/api/externalApi.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ChatMessageService } from './message/chatMessage.service'
import { ChatMessageDAO } from './message/dao/chatMessage.dao'
import { CollectionEntity } from '../database/entities/collection.entity'
import { DocumentEntity } from '../database/document/entities/document.entity'
import { UserEntity } from '../user/entities/user.entity'

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>('BASE_URL'),
        timeout: configService.get('HTTP_TIMEOUT'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity, UserEntity]),
    TypeOrmModule.forFeature([CollectionEntity, DocumentEntity], 'rag'),
    AuthModule,
    ChatSessionModule,
    ChatMessageModule,
  ],
  providers: [ChatService, ChatSessionDAO, ChatMessageDAO, ExternalApiService, ChatMessageService],
  controllers: [ChatController],
})
export class ChatModule {}

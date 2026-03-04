import { Controller, MiddlewareConsumer } from '@nestjs/common'
import { ChatService } from './chat.service'
import { LogRequestMiddleware } from '../../app.middleware'

@Controller('chat')
class ChatController {
  constructor(private readonly chatService: ChatService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(ChatController)
  }
}

export default ChatController

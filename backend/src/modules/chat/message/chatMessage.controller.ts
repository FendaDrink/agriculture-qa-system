import {
  Body,
  Controller,
  Delete,
  Get,
  MiddlewareConsumer,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ChatMessageService } from './chatMessage.service'
import { LogRequestMiddleware } from '../../../app.middleware'
import { AuthGuard } from '../../auth/auth.guard'
import { ChatMessageDto } from './dto/chatMessage.dto'
import { CreateChatMessageDto } from './dto/createChatMessage.dto'
import { UpdateChatMessageDto } from './dto/updateChatMessage.dto'

@Controller('chat/message')
class ChatMessageController {
  constructor(private readonly chatMessageService: ChatMessageService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(ChatMessageController)
  }

  /** message 相关**/
  /**
   * 查找某个 sessionId 下所有消息
   */
  @Get()
  @UseGuards(AuthGuard)
  async getAllChatMessages(@Query('messageId') messageId: string): Promise<ChatMessageDto[]> {
    return this.chatMessageService.findAllChatMessage(messageId)
  }

  /**
   * 创建新的消息
   */
  @Post()
  @UseGuards(AuthGuard)
  async createChatMessage(@Body() chatMessageDto: CreateChatMessageDto): Promise<ChatMessageDto> {
    return this.chatMessageService.createChatMessage(chatMessageDto)
  }

  /**
   * 修改某一个消息
   */
  @Patch()
  @UseGuards(AuthGuard)
  async updateChatMessage(@Body() chatMessageDto: UpdateChatMessageDto): Promise<ChatMessageDto> {
    return this.chatMessageService.updateChatMessage(chatMessageDto)
  }

  /**
   * 删除消息
   */
  @Delete()
  @UseGuards(AuthGuard)
  async deleteChatSession(@Query('messageId') messageId: string): Promise<void> {
    return this.chatMessageService.deleteChatMessage(messageId)
  }
}

export default ChatMessageController

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
import { ChatSessionService } from './chatSession.service'
import { LogRequestMiddleware } from '../../../app.middleware'
import { AuthGuard } from '../../auth/auth.guard'
import { ChatSessionDto } from './dto/chatSession.dto'
import { CreateChatSessionDto } from './dto/createChatSession.dto'
import { UpdateChatSessionDto } from './dto/updateChatSession.dto'

@Controller('chat/sessions')
class ChatSessionController {
  constructor(private readonly chatService: ChatSessionService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(ChatSessionController)
  }

  /** session 相关**/
  /**
   * 查找所有 chatSession
   */
  @Get()
  @UseGuards(AuthGuard)
  async getAllChatSessions(): Promise<ChatSessionDto[]> {
    return this.chatService.findAllChatSessions()
  }

  /**
   * 查找某一个用户下所有的 chatSession
   */
  @Get('/user')
  @UseGuards(AuthGuard)
  async getChatSessionsByUserId(@Query('userId') userId: string): Promise<ChatSessionDto[]> {
    return this.chatService.findAllChatSessionsByUserId(userId)
  }

  /**
   * 创建新的会话
   */
  @Post()
  @UseGuards(AuthGuard)
  async createChatSession(@Body() chatSessionDto: CreateChatSessionDto): Promise<ChatSessionDto> {
    return this.chatService.createChatSession(chatSessionDto)
  }

  /**
   * 修改某一个会话
   */
  @Patch()
  @UseGuards(AuthGuard)
  async updateChatSession(@Body() chatSessionDto: UpdateChatSessionDto): Promise<ChatSessionDto> {
    return this.chatService.updateChatSession(chatSessionDto)
  }

  /**
   * 删除会话
   */
  @Delete()
  @UseGuards(AuthGuard)
  async deleteChatSession(@Query('sessionId') sessionId: string): Promise<void> {
    return this.chatService.deleteChatSession(sessionId)
  }
}

export default ChatSessionController

import {
  Body,
  Controller,
  Get,
  MiddlewareConsumer,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ChatService } from './chat.service'
import { LogRequestMiddleware } from '../../app.middleware'
import { AuthGuard } from '../auth/auth.guard'
import { SpeechResDto } from './dto/speechRes.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { CompletionDto } from './dto/completion.dto'
import { FollowupDto } from './dto/followup.dto'
import { Response } from 'express'
import { SessionTitleDto } from './dto/sessionTitle.dto'

@Controller('chat')
class ChatController {
  constructor(private readonly chatService: ChatService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(ChatController)
  }

  @Post('/speech')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async speech(
    @UploadedFile() file: Express.Multer.File,
    @Query('model') model?: string,
  ): Promise<SpeechResDto> {
    return this.chatService.speechRecognize(file, model)
  }

  @Post('/completion')
  @UseGuards(AuthGuard)
  async completion(@Body() data: CompletionDto, @Req() req: any, @Res() res: Response): Promise<any> {
    return this.chatService.completion(data, res, req?.user)
  }

  @Post('/followup-suggestions')
  @UseGuards(AuthGuard)
  async followupSuggestions(@Body() data: FollowupDto): Promise<{ items: string[] }> {
    return this.chatService.followupSuggestions(data)
  }

  @Post('/session-title')
  @UseGuards(AuthGuard)
  async sessionTitle(@Body() data: SessionTitleDto): Promise<{ title: string }> {
    return this.chatService.generateSessionTitle(data)
  }

  @Get('/weekly-progress')
  @UseGuards(AuthGuard)
  async weeklyProgress(@Req() req: any) {
    return this.chatService.getWeeklyProgress(req?.user?.userId || '')
  }
}

export default ChatController

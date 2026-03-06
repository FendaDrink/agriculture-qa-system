import {
  Body,
  Controller,
  MiddlewareConsumer,
  Post,
  Query,
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
import { Response } from 'express'

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
  async completion(@Body() data: CompletionDto, @Res() res: Response): Promise<any> {
    return this.chatService.completion(data, res)
  }
}

export default ChatController

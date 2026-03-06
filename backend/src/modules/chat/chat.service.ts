import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ChatSessionDAO } from './session/dao/chatSession.dao'
import { SpeechResDto } from './dto/speechRes.dto'
import { ExternalApiService } from '../../common/api/externalApi.service'
import { CompletionDto } from './dto/completion.dto'
import { Readable } from 'stream'
import { Response } from 'express'
import { ChatMessageService } from './message/chatMessage.service'

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private chatSessionDAO: ChatSessionDAO, // 注入 ChatSessionDao
    private externalApiService: ExternalApiService,
    private chatMessageService: ChatMessageService,
  ) {}

  /**
   * 语音识别
   */
  async speechRecognize(file: Express.Multer.File, model?: string): Promise<SpeechResDto> {
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('类型错误，必需上传音频文件')
    }
    const newModel = model || 'whisper-1'
    try {
      return await this.externalApiService.speechRecognize(file, newModel)
    } catch (err) {
      throw new HttpException('语音识别失败，请重试', HttpStatus.NOT_IMPLEMENTED)
    }
  }

  /**
   * 聊天接口
   */
  async completion(completionData: CompletionDto, res: Response): Promise<any> {
    try {
      // 写入用户输入
      const userMsg = {
        sessionId: completionData.sessionId,
        sender: 1,
        content: completionData.query,
      }
      await this.chatMessageService.createChatMessage(userMsg)
      const stream: Readable = await this.externalApiService.completion(completionData)
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      let fullText = ''

      // 接收到内容的处理
      stream.on('data', (chunk) => {
        const text = chunk.toString()

        // 按照换行符将 chunk 进行分段
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.replace('data:', '').trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              const content = json?.choices?.[0]?.delta?.content
              if (content) {
                fullText += content
              }
            } catch (e) {
              res.end()
            }
          }
        }
        res.write(chunk)
      })

      // 流式结束时的处理
      stream.on('end', async () => {
        console.log('最终完整内容:', fullText)

        // 写入回答
        const assistMsg = {
          sessionId: completionData.sessionId,
          sender: 0,
          content: fullText,
        }
        await this.chatMessageService.createChatMessage(assistMsg)
        res.end()
      })

      // 错误处理
      stream.on('error', (err) => {
        console.error(err)
        res.end()
      })
      // stream.pipe(res)
    } catch (err) {
      console.log(err)
      res.end()
    }
  }
}

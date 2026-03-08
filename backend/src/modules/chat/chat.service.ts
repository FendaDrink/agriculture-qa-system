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
      res.status(200)
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders?.()

      let fullText = ''
      let pending = ''

      const parseSSELine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) return

        const data = trimmed.replace(/^data:\s*/, '')
        if (!data || data === '[DONE]') return

        try {
          const json = JSON.parse(data)
          const content = json?.choices?.[0]?.delta?.content
          if (content) fullText += content
        } catch {
          // 忽略非 JSON 行，不中断流式返回
        }
      }

      // 接收到内容的处理
      stream.on('data', (chunk) => {
        const text = chunk.toString('utf8')
        pending += text
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() || ''
        lines.forEach(parseSSELine)
        res.write(chunk)
      })

      // 流式结束时的处理
      stream.on('end', async () => {
        if (pending.trim()) parseSSELine(pending)

        if (!fullText.trim()) {
          fullText = '未获取到有效回复，请稍后重试。'
        }

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
        if (!res.writableEnded) {
          res.write('data: {"error":"stream_error"}\n\n')
        }
        res.end()
      })
      // stream.pipe(res)
    } catch (err) {
      console.log(err)
      res.end()
    }
  }
}

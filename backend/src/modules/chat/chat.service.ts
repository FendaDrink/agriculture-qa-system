import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ChatSessionDAO } from './session/dao/chatSession.dao'
import { SpeechResDto } from './dto/speechRes.dto'
import { ExternalApiService } from '../../common/api/externalApi.service'
import { CompletionDto } from './dto/completion.dto'
import { Readable } from 'stream'
import { Response } from 'express'
import { ChatMessageService } from './message/chatMessage.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CollectionEntity } from '../database/entities/collection.entity'

const HUBEI_CITIES = [
  '武汉',
  '黄石',
  '十堰',
  '宜昌',
  '襄阳',
  '鄂州',
  '荆门',
  '孝感',
  '荆州',
  '黄冈',
  '咸宁',
  '随州',
  '恩施',
  '仙桃',
  '潜江',
  '天门',
  '神农架',
]

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private chatSessionDAO: ChatSessionDAO, // 注入 ChatSessionDao
    private externalApiService: ExternalApiService,
    private chatMessageService: ChatMessageService,
    @InjectRepository(CollectionEntity, 'rag')
    private readonly collectionRepo: Repository<CollectionEntity>,
  ) {}

  private extractCityFromQuery(query: string): string {
    const normalized = (query || '').replace(/\s+/g, '')
    const direct = HUBEI_CITIES.find((city) => normalized.includes(city))
    return direct || ''
  }

  private async resolveRecallCollections(query: string, fallbackCollectionId?: string) {
    const city = this.extractCityFromQuery(query)
    const allCollections = await this.collectionRepo.find()
    const findByName = (matcher: (name: string) => boolean) =>
      allCollections
        .filter((item) => matcher(item.collectionName || ''))
        .sort((a, b) => +new Date(b.updateTime) - +new Date(a.updateTime))[0]

    const cityCollection = city
      ? findByName((name) => name.includes(city) || name.includes(`${city}市`))
      : undefined
    const publicCollection =
      (process.env.PUBLIC_COLLECTION_ID
        ? allCollections.find((item) => item.id === process.env.PUBLIC_COLLECTION_ID)
        : undefined) ||
      findByName((name) => /(公共|全省|湖北省|省级)/.test(name))

    const collectionIds = [cityCollection?.id, publicCollection?.id, fallbackCollectionId]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index) as string[]

    return {
      city,
      collectionIds,
    }
  }

  private async buildContextChunks(query: string, collectionIds: string[], totalTopN = 5) {
    if (!collectionIds.length) return []
    const base = collectionIds.length === 1 ? [totalTopN] : [Math.ceil(totalTopN * 0.6), totalTopN - Math.ceil(totalTopN * 0.6)]
    const allocated = collectionIds.map((_, index) => base[index] || 1)

    const recalls = await Promise.all(
      collectionIds.map(async (collectionId, index) => {
        try {
          const response = await this.externalApiService.recall({
            query,
            collectionId,
            topN: allocated[index],
          })
          const items = Array.isArray(response?.items) ? response.items : []
          return items.map((item: any) => ({
            content: String(item?.content || ''),
            score: Number(item?.score ?? (Number.isFinite(Number(item?.distance)) ? 1 / (1 + Number(item.distance)) : 0)),
            sourceCollectionId: collectionId,
          }))
        } catch {
          return []
        }
      }),
    )

    const merged = recalls.flat()
      .filter((item) => item.content.trim())
      .sort((a, b) => b.score - a.score)

    const deduped: Array<{ content: string; score?: number; sourceCollectionId?: string }> = []
    const seen = new Set<string>()
    for (const item of merged) {
      const key = item.content.trim()
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(item)
      if (deduped.length >= totalTopN) break
    }
    return deduped
  }

  /**
   * 语音识别
   */
  async speechRecognize(file: Express.Multer.File, model?: string): Promise<SpeechResDto> {
    const mimeType = (file?.mimetype || '').toLowerCase()
    const ext = (file?.originalname || '').toLowerCase().split('.').pop() || ''
    const allowExt = ['mp3', 'wav', 'm4a', 'aac', 'webm', 'ogg', 'amr']
    const isAudioMime = mimeType.startsWith('audio/') || mimeType === 'application/octet-stream'
    if (!isAudioMime && !allowExt.includes(ext)) {
      throw new BadRequestException('类型错误，必须上传音频文件')
    }
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('上传音频为空')
    }
    const newModel = model || 'whisper-1'
    try {
      const result = await this.externalApiService.speechRecognize(file, newModel)
      return {
        text: (result?.text || '').trim(),
      }
    } catch (err) {
      throw new HttpException('语音识别失败，请重试', HttpStatus.NOT_IMPLEMENTED)
    }
  }

  /**
   * 聊天接口
   */
  async completion(completionData: CompletionDto, res: Response): Promise<any> {
    try {
      const recallTarget = await this.resolveRecallCollections(completionData.query, completionData.collectionId)
      const contextChunks = await this.buildContextChunks(completionData.query, recallTarget.collectionIds, 5)

      // 写入用户输入
      const userMsg = {
        sessionId: completionData.sessionId,
        sender: 1,
        content: completionData.query,
      }
      await this.chatMessageService.createChatMessage(userMsg)
      const stream: Readable = await this.externalApiService.completion({
        ...completionData,
        collectionId: recallTarget.collectionIds[0] || completionData.collectionId,
        contextChunks,
      })
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

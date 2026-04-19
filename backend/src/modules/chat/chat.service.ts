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
import { DocumentEntity } from '../database/document/entities/document.entity'
import { FollowupDto } from './dto/followup.dto'

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
    @InjectRepository(DocumentEntity, 'rag')
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  private quoteTableName(tableName: string): string {
    return `\`${String(tableName || '').replace(/`/g, '``')}\``
  }

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
            id: item?.id ? String(item.id) : '',
            content: String(item?.content || ''),
            score: Number(item?.score ?? (Number.isFinite(Number(item?.distance)) ? 1 / (1 + Number(item.distance)) : 0)),
            sourceCollectionId: collectionId,
            documentId: item?.documentId ? String(item.documentId) : item?.metadata?.documentId ? String(item.metadata.documentId) : '',
            fileHash: item?.fileHash ? String(item.fileHash) : item?.metadata?.fileHash ? String(item.metadata.fileHash) : '',
            fileName: item?.fileName ? String(item.fileName) : item?.metadata?.fileName ? String(item.metadata.fileName) : '',
          }))
        } catch {
          return []
        }
      }),
    )

    const merged = recalls.flat()
      .filter((item) => item.content.trim())
      .sort((a, b) => b.score - a.score)

    const deduped: Array<{
      id?: string
      content: string
      score?: number
      sourceCollectionId?: string
      documentId?: string
      fileHash?: string
      fileName?: string
    }> = []
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

  private async buildSourceMeta(
    chunks: Array<{
      id?: string
      content: string
      score?: number
      sourceCollectionId?: string
      documentId?: string
      fileHash?: string
      fileName?: string
    }>,
  ) {
    if (!chunks.length) return []

    const collectionIds = Array.from(new Set(chunks.map((c) => c.sourceCollectionId).filter(Boolean))) as string[]
    const docMap = new Map<string, DocumentEntity>()

    for (const collectionId of collectionIds) {
      const docs = await this.documentRepo.find({
        where: { collectionId },
        order: { updateTime: 'DESC' },
      })
      docs.forEach((doc) => docMap.set(doc.id, doc))
    }

    const unresolvedByCollection = new Map<string, Array<{ chunkId: string; chunkIndex: number }>>()
    const resolvedDocIdByIndex = new Map<number, string>()

    chunks.forEach((chunk, index) => {
      if (chunk.documentId && docMap.has(chunk.documentId)) {
        resolvedDocIdByIndex.set(index, chunk.documentId)
        return
      }
      if (!chunk.sourceCollectionId || !chunk.id) return
      const list = unresolvedByCollection.get(chunk.sourceCollectionId) || []
      list.push({ chunkId: chunk.id, chunkIndex: index })
      unresolvedByCollection.set(chunk.sourceCollectionId, list)
    })

    for (const [collectionId, unresolvedList] of unresolvedByCollection.entries()) {
      const docs = await this.documentRepo.find({
        where: { collectionId },
        order: { updateTime: 'DESC' },
      })
      const pending = unresolvedList.filter((item) => !resolvedDocIdByIndex.has(item.chunkIndex))
      if (!pending.length) continue

      for (const doc of docs) {
        if (!pending.length) break
        const tableName = this.quoteTableName(doc.id)
        const chunkIds = pending.map((item) => item.chunkId)
        const placeholders = chunkIds.map(() => '?').join(', ')
        try {
          const rows = await this.documentRepo.manager.query(
            `SELECT id FROM ${tableName} WHERE id IN (${placeholders})`,
            chunkIds,
          )
          const hitIds = new Set((rows || []).map((row: any) => String(row?.id || '')))
          if (!hitIds.size) continue
          for (let i = pending.length - 1; i >= 0; i--) {
            if (hitIds.has(pending[i].chunkId)) {
              resolvedDocIdByIndex.set(pending[i].chunkIndex, doc.id)
              pending.splice(i, 1)
            }
          }
        } catch {
          continue
        }
      }
    }

    const sourceRows = chunks
      .map((chunk, index) => {
        const docId = resolvedDocIdByIndex.get(index) || chunk.documentId
        const doc = docId ? docMap.get(docId) : undefined
        if (!doc) return null
        return {
          documentId: doc.id,
          fileName: chunk.fileName || doc.fileName,
          fileHash: chunk.fileHash || doc.fileHash,
          collectionId: chunk.sourceCollectionId || doc.collectionId,
          score: Number(chunk.score || 0),
          chunkId: chunk.id || '',
        }
      })
      .filter(Boolean) as Array<{
      documentId: string
      fileName: string
      fileHash: string
      collectionId: string
      score: number
      chunkId: string
    }>

    const deduped = new Map<string, (typeof sourceRows)[number]>()
    for (const row of sourceRows) {
      // 同一文件只保留一条（最高分），避免来源列表重复
      const key = row.documentId || row.fileHash || row.fileName
      if (!deduped.has(key) || (deduped.get(key)?.score || 0) < row.score) {
        deduped.set(key, row)
      }
    }

    return Array.from(deduped.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        index: index + 1,
      }))
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
      const sourceMeta = await this.buildSourceMeta(contextChunks)
      const sourceIndexByDocumentId = new Map<string, number>()
      sourceMeta.forEach((item: any) => {
        if (item.documentId) sourceIndexByDocumentId.set(String(item.documentId), Number(item.index || 0))
      })
      const citedContextChunks = contextChunks.map((chunk: any) => {
        const docIdx = chunk?.documentId ? sourceIndexByDocumentId.get(String(chunk.documentId)) : undefined
        if (!docIdx) return chunk
        return {
          ...chunk,
          content: `[${docIdx}] ${chunk.content}`,
        }
      })

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
        contextChunks: citedContextChunks,
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
        if (sourceMeta.length > 0 && !/\[(?:来源)?\d+\]/.test(fullText)) {
          const refs = sourceMeta.map((item: any) => `[${item.index}]`).join('')
          fullText = `${fullText}\n\n参考来源：${refs}`
        }

        // 写入回答
        const assistMsg = {
          sessionId: completionData.sessionId,
          sender: 0,
          content: fullText,
          extra: {
            sources: sourceMeta,
            city: recallTarget.city,
          },
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

  async followupSuggestions(payload: FollowupDto): Promise<{ items: string[] }> {
    const sessionId = (payload.sessionId || '').trim()
    if (!sessionId) {
      throw new BadRequestException('缺少会话ID')
    }

    let history = Array.isArray(payload.history) ? payload.history : []
    if (!history.length) {
      const allMessages = await this.chatMessageService.findAllChatMessage(sessionId)
      history = allMessages
        .filter((item) => item.status === 1)
        .sort((a, b) => +new Date(a.createTime) - +new Date(b.createTime))
        .map((item) => ({
          sender: item.sender,
          content: item.content,
          extra: item.extra,
        }))
        .slice(-12)
    }

    const response = await this.externalApiService.followupSuggestions({
      ...payload,
      history,
    })
    const items = Array.isArray(response?.items)
      ? response.items
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, payload.limit || 3)
      : []
    return { items }
  }
}

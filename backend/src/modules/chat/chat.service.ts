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
import { ChatSessionEntity } from './session/entities/chatSession.entity'
import { ChatMessageEntity } from './message/entities/chatMessage.entity'
import { SessionTitleDto } from './dto/sessionTitle.dto'
import { UserEntity } from '../user/entities/user.entity'
import {
  cityCodeToName,
  cityNameToCode,
  HUBEI_CITY_NAME_LIST,
  HubeiCityCode,
  normalizeCityNameText,
} from '../../common/constants/city'

const HUBEI_CITIES = HUBEI_CITY_NAME_LIST.map((name) => normalizeCityNameText(name)).filter(Boolean)

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private chatSessionDAO: ChatSessionDAO, // 注入 ChatSessionDao
    private externalApiService: ExternalApiService,
    private chatMessageService: ChatMessageService,
    @InjectRepository(ChatSessionEntity)
    private readonly chatSessionRepo: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly chatMessageRepo: Repository<ChatMessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CollectionEntity, 'rag')
    private readonly collectionRepo: Repository<CollectionEntity>,
    @InjectRepository(DocumentEntity, 'rag')
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  async getWeeklyProgress(userId: string) {
    if (!userId) {
      return {
        rangeStart: '',
        rangeEnd: '',
        totalSessions: 0,
        totalQuestions: 0,
        days: [],
      }
    }

    const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
    const formatDate = (date: Date) => {
      const y = date.getFullYear()
      const m = `${date.getMonth() + 1}`.padStart(2, '0')
      const d = `${date.getDate()}`.padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)

    const sessionCreateRows = await this.chatSessionRepo.createQueryBuilder('s')
      .select("DATE_FORMAT(s.create_time, '%Y-%m-%d')", 'date')
      .addSelect('s.id', 'sessionId')
      .where('s.create_by = :userId', { userId })
      .andWhere('s.status = 1')
      .andWhere('s.create_time BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawMany<{ date: string; sessionId: string }>()

    const questionRows = await this.chatMessageRepo.createQueryBuilder('m')
      .innerJoin(ChatSessionEntity, 's', 's.id = m.session_id')
      .select("DATE_FORMAT(m.create_time, '%Y-%m-%d')", 'date')
      .addSelect('m.session_id', 'sessionId')
      .where('s.create_by = :userId', { userId })
      .andWhere('s.status = 1')
      .andWhere('m.sender = 1')
      .andWhere('m.status = 1')
      .andWhere('m.create_time BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawMany<{ date: string; sessionId: string }>()

    const questionMap = new Map<string, number>()
    const sessionDailyMap = new Map<string, Set<string>>()

    sessionCreateRows.forEach((item) => {
      if (!item?.date || !item?.sessionId) return
      const dailySet = sessionDailyMap.get(item.date) || new Set<string>()
      dailySet.add(String(item.sessionId))
      sessionDailyMap.set(item.date, dailySet)
    })

    questionRows.forEach((item) => {
      if (!item?.date) return
      questionMap.set(item.date, (questionMap.get(item.date) || 0) + 1)
      if (item?.sessionId) {
        const dailySet = sessionDailyMap.get(item.date) || new Set<string>()
        dailySet.add(String(item.sessionId))
        sessionDailyMap.set(item.date, dailySet)
      }
    })

    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + idx)
      const key = formatDate(d)
      return {
        date: key,
        label: `周${weekLabels[d.getDay()]}`,
        sessions: sessionDailyMap.get(key)?.size || 0,
        questions: questionMap.get(key) || 0,
      }
    })

    return {
      rangeStart: formatDate(startDate),
      rangeEnd: formatDate(endDate),
      totalSessions: days.reduce((sum, item) => sum + item.sessions, 0),
      totalQuestions: days.reduce((sum, item) => sum + item.questions, 0),
      days,
    }
  }

  private quoteTableName(tableName: string): string {
    return `\`${String(tableName || '').replace(/`/g, '``')}\``
  }

  private extractCityFromQuery(query: string): string {
    const normalized = (query || '').replace(/\s+/g, '')
    const direct = HUBEI_CITIES.find((city) => normalized.includes(city))
    return direct || ''
  }

  private normalizeCityName(city?: string | number): string {
    const value = normalizeCityNameText(cityCodeToName(city as any, String(city ?? '')))
    if (!value) return ''
    const hit = HUBEI_CITIES.find((item) => value.includes(item))
    if (hit) return hit
    return normalizeCityNameText(value)
  }

  private normalizeLocationName(value?: string | number): string {
    return normalizeCityNameText(value)
  }

  private async resolveRecallCollections(query: string, userCity?: string | number, fallbackCollectionId?: string) {
    const cityFromQuery = this.extractCityFromQuery(query)
    const cityFromUser = this.normalizeCityName(userCity)
    const city = cityFromQuery || cityFromUser
    const allCollections = await this.collectionRepo.find()
    const cityCode = city ? cityNameToCode(city, HubeiCityCode.HUBEI_PROVINCE) : undefined
    const isProvinceCollection = (item?: CollectionEntity) =>
      !!item && cityNameToCode(item.city as any, -1 as any) === HubeiCityCode.HUBEI_PROVINCE
    const isCityCollection = (item?: CollectionEntity) =>
      !!item && cityCode !== undefined && cityNameToCode(item.city as any, -1 as any) === cityCode
    const findById = (collectionId?: string) =>
      collectionId ? allCollections.find((item) => item.id === collectionId) : undefined
    const findByName = (matcher: (name: string) => boolean) =>
      allCollections
        .filter((item) => matcher(item.collectionName || ''))
        .sort((a, b) => +new Date(b.updateTime) - +new Date(a.updateTime))[0]
    const findByCity = (targetCity: string | number) => {
      const targetCityCode = cityNameToCode(targetCity, HubeiCityCode.HUBEI_PROVINCE)
      return allCollections
        .filter((item) => cityNameToCode(item.city as any, HubeiCityCode.HUBEI_PROVINCE) === targetCityCode)
        .sort((a, b) => +new Date(b.updateTime) - +new Date(a.updateTime))[0]
    }

    const cityCollection = city ? findByCity(city) : undefined
    const configuredPublicCollection = findById(process.env.PUBLIC_COLLECTION_ID)
    const publicCollection =
      (isProvinceCollection(configuredPublicCollection) ? configuredPublicCollection : undefined) ||
      findByCity(HubeiCityCode.HUBEI_PROVINCE) ||
      findByName((name) => /(公共|全省|湖北省|省级)/.test(name)) ||
      undefined

    const safeFallbackCollection = (() => {
      const item = findById(fallbackCollectionId)
      if (!item) return undefined
      if (isProvinceCollection(item)) return item
      if (isCityCollection(item)) return item
      return undefined
    })()

    const collectionIds = [cityCollection?.id, publicCollection?.id, safeFallbackCollection?.id]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index) as string[]

    return {
      city,
      collectionIds,
    }
  }

  private async resolveCurrentUserCity(user?: { userId?: string; city?: string | number }) {
    const userId = String(user?.userId || '').trim()
    if (!userId) return user?.city
    try {
      const currentUser = await this.userRepo.findOne({ where: { id: userId } })
      if (currentUser?.city !== undefined && currentUser?.city !== null) {
        return currentUser.city
      }
    } catch {
      // ignore and fallback to token payload city
    }
    return user?.city
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

  private isSmallTalkQuery(query?: string): boolean {
    const text = String(query || '').trim().toLowerCase()
    if (!text) return true
    const compact = text.replace(/\s+/g, '')
    const smallTalkPatterns = [
      /^你好+$/,
      /^您好+$/,
      /^hi+$/,
      /^hello+$/,
      /^在吗$/,
      /^哈喽+$/,
      /^嗨+$/,
      /^早上好$/,
      /^中午好$/,
      /^下午好$/,
      /^晚上好$/,
      /^谢谢$/,
      /^thanks?$/,
      /^ok$/,
      /^好的?$/,
    ]
    return smallTalkPatterns.some((pattern) => pattern.test(compact))
  }

  private buildCitationQuery(query: string, hasSources: boolean): string {
    const rawQuery = String(query || '').trim()
    if (!rawQuery || !hasSources || this.isSmallTalkQuery(rawQuery)) {
      return rawQuery
    }

    return [
      rawQuery,
      '',
      '请基于提供的信息回答，并遵守以下规则：',
      '1. 只有当某句话或某一段明确使用了提供的信息内容时，才在句末或段落末尾标注对应序号，如 [1]、[2]。',
      '2. 序号必须与信息前的编号严格一致；如果同一句使用多个来源，可连续标注，如 [1][2]。',
      '3. 没有使用这些信息支撑的内容，不要强行标注序号。',
      '4. 不要单独生成“参考文献”或“引用说明”标题，直接在正文中自然标注即可。',
    ].join('\n')
  }

  private async readStreamText(stream: Readable): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      let fullText = ''
      let pending = ''

      const parseLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) return
        const data = trimmed.replace(/^data:\s*/, '')
        if (!data || data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const content = json?.choices?.[0]?.delta?.content
          if (content) fullText += content
        } catch {
          fullText += data
        }
      }

      stream.on('data', (chunk) => {
        const text = chunk.toString('utf8')
        pending += text
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() || ''
        lines.forEach(parseLine)
      })

      stream.on('end', () => {
        if (pending.trim()) parseLine(pending)
        resolve(fullText.trim())
      })

      stream.on('error', (error) => reject(error))
    })
  }

  async generateSessionTitle(payload: SessionTitleDto): Promise<{ title: string }> {
    const query = String(payload?.query || '').trim()
    const answer = String(payload?.answer || '').trim()
    const fallbackTitle = query.slice(0, 18) || '新会话'
    if (!query) {
      return { title: '新会话' }
    }

    try {
      const stream: Readable = await this.externalApiService.completion({
        query: [
          '请根据用户问题生成一个简短会话标题，要求：',
          '1. 仅输出标题本身，不要解释。',
          '2. 18个字以内，简洁明确，便于用户识别本次咨询主题。',
          '3. 贴近用户问题内容，适合作为会话列表标题。',
          '4. 不要带书名号、引号、句号等多余符号。',
          answer ? '5. 如果提供了回答内容，请结合整轮问答内容进行概括，标题要比单独看问题更准确。' : '',
          '',
          `用户问题：${query}`,
          answer ? `回答内容：${answer}` : '',
        ].join('\n'),
        model: payload?.model,
        sessionId: '',
        history: [],
      } as any)

      const rawTitle = await this.readStreamText(stream)
      const cleanTitle = String(rawTitle || '')
        .replace(/[""'']/g, '')
        .replace(/[。！？!?,，：:；;]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 18)

      return {
        title: cleanTitle || fallbackTitle,
      }
    } catch {
      return {
        title: fallbackTitle,
      }
    }
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
  async completion(
    completionData: CompletionDto,
    res: Response,
    user?: { userId?: string; city?: string | number },
  ): Promise<any> {
    try {
      const currentUserCity = await this.resolveCurrentUserCity(user)
      const recallTarget = await this.resolveRecallCollections(
        completionData.query,
        currentUserCity,
        completionData.collectionId,
      )
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
      const completionQuery = this.buildCitationQuery(completionData.query, sourceMeta.length > 0)
      const stream: Readable = await this.externalApiService.completion({
        ...completionData,
        query: completionQuery,
        collectionId: recallTarget.collectionIds[0],
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
        // 仅在回答正文显式引用来源编号时返回来源列表，避免闲聊场景强制展示来源
        const citedIndexes = new Set<number>()
        const citationRegex = /\[(?:来源)?(\d+)\]/g
        let match: RegExpExecArray | null
        while ((match = citationRegex.exec(fullText)) !== null) {
          const index = Number(match[1])
          if (!Number.isNaN(index) && index > 0) {
            citedIndexes.add(index)
          }
        }
        const citedSourceMeta = sourceMeta.filter((item: any) => citedIndexes.has(Number(item.index)))
        const finalSources = citedSourceMeta

        // 写入回答
        const assistMsg = {
          sessionId: completionData.sessionId,
          sender: 0,
          content: fullText,
          extra: {
            sources: finalSources,
            city: recallTarget.city,
            recallCollectionIds: recallTarget.collectionIds,
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

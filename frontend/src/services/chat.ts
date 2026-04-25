import Taro from '@tarojs/taro'
import { apiDelete, apiGet, apiPatch, apiPost } from './api'
import { getAppSettings, saveAppSettings } from './settings'
import { ChatMessage, ChatSession, CompletionPayload, FaqQuestionItem, UserProfile } from '@/types/chat'

export interface QuickQuestionItem {
  question: string
  frequency?: number | null
}

export interface FollowupPayload {
  sessionId: string
  query?: string
  history?: Array<{ sender: 0 | 1; content: string; extra?: Record<string, unknown> }>
  limit?: number
  model?: string
}

export interface SessionTitlePayload {
  query: string
  answer?: string
  model?: string
}

export interface WeeklyProgressPoint {
  date: string
  label: string
  sessions: number
  questions: number
}

export interface WeeklyProgressData {
  rangeStart: string
  rangeEnd: string
  totalSessions: number
  totalQuestions: number
  days: WeeklyProgressPoint[]
}

const buildEmptyWeeklyProgress = (): WeeklyProgressData => ({
  rangeStart: '',
  rangeEnd: '',
  totalSessions: 0,
  totalQuestions: 0,
  days: [],
})

const formatDayKey = (date: Date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseDateValue = (value?: string | Date | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const buildWeeklyProgressFallback = async (): Promise<WeeklyProgressData> => {
  const sessions = await listSessions().catch(() => [])
  if (!sessions.length) return buildEmptyWeeklyProgress()

  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - 6)
  startDate.setHours(0, 0, 0, 0)

  const inRange = (date: Date | null) => !!date && date >= startDate && date <= endDate
  const sessionDailyMap = new Map<string, Set<string>>()
  const questionMap = new Map<string, number>()

  const messageRows = await Promise.all(
    sessions.map(async (session) => ({
      session,
      messages: await listMessages(session.id).catch(() => []),
    })),
  )

  sessions.forEach((session) => {
    const createdAt = parseDateValue((session as any).createTime || (session as any).updateTime)
    if (!inRange(createdAt)) return
    const key = formatDayKey(createdAt as Date)
    const dailySet = sessionDailyMap.get(key) || new Set<string>()
    dailySet.add(String(session.id))
    sessionDailyMap.set(key, dailySet)
  })

  messageRows.forEach(({ session, messages }) => {
    messages.forEach((message) => {
      if (Number(message.sender) !== 1 || Number(message.status) !== 1) return
      const createdAt = parseDateValue(message.createTime)
      if (!inRange(createdAt)) return
      const key = formatDayKey(createdAt as Date)
      questionMap.set(key, (questionMap.get(key) || 0) + 1)
      const dailySet = sessionDailyMap.get(key) || new Set<string>()
      dailySet.add(String(session.id))
      sessionDailyMap.set(key, dailySet)
    })
  })

  const days = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + idx)
    const key = formatDayKey(date)
    return {
      date: key,
      label: `周${weekLabels[date.getDay()]}`,
      sessions: sessionDailyMap.get(key)?.size || 0,
      questions: questionMap.get(key) || 0,
    }
  })

  return {
    rangeStart: formatDayKey(startDate),
    rangeEnd: formatDayKey(endDate),
    totalSessions: days.reduce((sum, item) => sum + item.sessions, 0),
    totalQuestions: days.reduce((sum, item) => sum + item.questions, 0),
    days,
  }
}

interface StreamState {
  buffer: string
  full: string
}

const decodeResponseText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (!value) return ''

  const maybeArrayBuffer = value as ArrayBuffer
  if (typeof ArrayBuffer !== 'undefined' && maybeArrayBuffer instanceof ArrayBuffer) {
    try {
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(new Uint8Array(maybeArrayBuffer))
      }
    } catch {
      // ignore
    }
    const anyTaro = Taro as any
    if (typeof anyTaro?.arrayBufferToString === 'function') {
      try {
        return anyTaro.arrayBufferToString(maybeArrayBuffer)
      } catch {
        // ignore
      }
    }
  }

  const maybeTypedArray = value as Uint8Array
  if (typeof Uint8Array !== 'undefined' && maybeTypedArray instanceof Uint8Array) {
    try {
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(maybeTypedArray)
      }
    } catch {
      // ignore
    }
  }

  const maybeDataWrapper = value as { data?: unknown }
  if (maybeDataWrapper && typeof maybeDataWrapper === 'object' && 'data' in maybeDataWrapper) {
    return decodeResponseText(maybeDataWrapper.data)
  }

  return String(value)
}

const processSSELine = (
  line: string,
  state: StreamState,
  onDelta?: (delta: string, full: string) => void,
) => {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return

  const payload = trimmed.replace(/^data:\s*/, '')
  if (!payload || payload === '[DONE]') return

  try {
    const json = JSON.parse(payload)
    const delta = json?.choices?.[0]?.delta?.content || ''
    if (delta) {
      state.full += delta
      onDelta?.(delta, state.full)
    }
    return
  } catch {
    // Fallback for plain text payload.
  }

  state.full += payload
  onDelta?.(payload, state.full)
}

const consumeSSEText = (
  text: string,
  state: StreamState,
  onDelta?: (delta: string, full: string) => void,
) => {
  if (!text) return
  state.buffer += text
  const lines = state.buffer.split(/\r?\n/)
  state.buffer = lines.pop() || ''
  lines.forEach((line) => processSSELine(line, state, onDelta))
}

const parseSSEContent = (raw: string): string => {
  if (!raw) return ''

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))

  let full = ''

  lines.forEach((line) => {
    const payload = line.replace(/^data:\s*/, '')
    if (!payload || payload === '[DONE]') return
    try {
      const json = JSON.parse(payload)
      const chunk = json?.choices?.[0]?.delta?.content || ''
      if (chunk) full += chunk
    } catch {
      // Non-SSE fallback
    }
  })

  return full || raw
}

export const login = async (userId: string, password: string) => {
  const data = await apiPost<{ token: string }>('/auth/login', { userId, password })
  return data.token
}

export interface RegisterPayload {
  id: string
  username: string
  city?: number
  password: string
}

export interface UpdateCurrentUserPayload {
  username?: string
  city?: number
}

export const register = async (payload: RegisterPayload): Promise<UserProfile> => {
  return apiPost<UserProfile>('/user', {
    ...payload,
    roleId: 2,
    status: 1,
  })
}

export const listUsers = async (): Promise<UserProfile[]> => {
  return apiGet<UserProfile[]>('/user')
}

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const settings = getAppSettings()
  if (!settings.userId) return null
  const users = await listUsers()
  return users.find((u) => u.id === settings.userId) || null
}

export const updateCurrentUser = async (payload: UpdateCurrentUserPayload): Promise<UserProfile> => {
  const settings = getAppSettings()
  if (!settings.userId) {
    throw new Error('请先登录后再修改信息')
  }
  const data = await apiPatch<UserProfile>('/user', {
    id: settings.userId,
    ...payload,
  })
  if (data?.username) {
    saveAppSettings({
      ...settings,
      username: data.username,
    })
  }
  return data
}

export const listSessions = async (): Promise<ChatSession[]> => {
  const settings = getAppSettings()
  if (!settings.userId) {
    throw new Error('请先在“我的”页配置用户ID')
  }

  const data = await apiGet<ChatSession[]>('/chat/sessions/user', { userId: settings.userId })
  return data.sort((a, b) => (a.updateTime < b.updateTime ? 1 : -1))
}

export const createSession = async (title: string): Promise<ChatSession> => {
  const settings = getAppSettings()
  if (!settings.userId) {
    throw new Error('请先在“我的”页配置用户ID')
  }

  return apiPost<ChatSession>('/chat/sessions', {
    title: title || '新会话',
    createBy: settings.userId,
  })
}

export const generateSessionTitle = async (payload: SessionTitlePayload): Promise<string> => {
  const data = await apiPost<{ title: string }>('/chat/session-title', payload as unknown as Record<string, unknown>)
  return String(data?.title || '').trim()
}

export const updateSessionTitle = async (id: string, title: string): Promise<ChatSession> => {
  return apiPatch<ChatSession>('/chat/sessions', {
    id,
    title: String(title || '').trim(),
  })
}

export const deleteSession = async (sessionId: string): Promise<void> => {
  await apiDelete<void>('/chat/sessions', { sessionId })
}

export const listMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  const data = await apiGet<ChatMessage[]>('/chat/message', { messageId: sessionId })
  return data.sort((a, b) => (a.createTime > b.createTime ? 1 : -1))
}

export const appendMessage = async (
  sessionId: string,
  sender: 0 | 1,
  content: string,
): Promise<ChatMessage> => {
  return apiPost<ChatMessage>('/chat/message', {
    sessionId,
    sender,
    content,
  })
}

export const completion = async (payload: CompletionPayload): Promise<string> => {
  return streamCompletion(payload)
}

export const streamCompletion = async (
  payload: CompletionPayload,
  onDelta?: (delta: string, full: string) => void,
  options?: {
    onTaskCreated?: (task: Taro.RequestTask<any>) => void
  },
): Promise<string> => {
  const settings = getAppSettings()
  const baseUrl = settings.baseUrl.trim().replace(/\/$/, '')
  const token = settings.token.trim()

  const state: StreamState = { buffer: '', full: '' }

  return await new Promise<string>((resolve, reject) => {
    const requestTask = Taro.request<string>({
      url: `${baseUrl}/chat/completion`,
      method: 'POST',
      data: payload,
      responseType: 'text',
      enableChunked: true,
      header: {
        'Content-Type': 'application/json',
        'X-Client-App': 'frontend',
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(`问答请求失败：${res.statusCode}`))
          return
        }

        // 如果没有走分片回调，这里做一次整体解析兜底
        if (!state.full) {
          const fallback = parseSSEContent(decodeResponseText(res.data))
          state.full = fallback
          if (fallback) onDelta?.(fallback, fallback)
        }
        resolve(state.full)
      },
      fail: (err) => reject(err),
    })
    options?.onTaskCreated?.(requestTask)

    requestTask?.onChunkReceived?.((event: any) => {
      const text = decodeResponseText(event?.data)
      consumeSSEText(text, state, onDelta)
    })
  })
}

export const speechRecognizeByFile = async (tempFilePath: string, model = 'gpt-audio-1.5') => {
  const settings = getAppSettings()
  const baseUrl = settings.baseUrl.trim().replace(/\/$/, '')
  const token = settings.token.trim()

  return await new Promise<string>((resolve, reject) => {
    Taro.uploadFile({
      url: `${baseUrl}/chat/speech?model=${encodeURIComponent(model)}`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client-App': 'frontend',
      },
      success: (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(`语音识别失败：${res.statusCode}`))
          return
        }
        try {
          const parsed = JSON.parse(res.data || '{}') as any
          if (parsed?.code !== 200) {
            reject(new Error(parsed?.message || '语音识别失败'))
            return
          }
          resolve((parsed?.data?.text || '').trim())
        } catch (error) {
          reject(new Error('语音识别返回格式异常'))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

export const listFaqQuestions = async (limit = 20): Promise<FaqQuestionItem[]> => {
  const data = await apiGet<{ items: FaqQuestionItem[] }>('/faq', { limit })
  return data?.items || []
}

export const listQuickQuestions = async (limit = 4): Promise<QuickQuestionItem[]> => {
  const data = await apiGet<{ items: FaqQuestionItem[] }>('/faq/recommend', { limit })
  const items = data?.items || []
  return items
    .map((item) => ({
      question: item.question,
      frequency: item.frequency ?? null,
    }))
    .filter((item) => !!item.question)
}

export const getFollowupSuggestions = async (payload: FollowupPayload): Promise<string[]> => {
  const data = await apiPost<{ items: string[] }>('/chat/followup-suggestions', payload as any)
  return Array.isArray(data?.items) ? data.items : []
}

export const getWeeklyProgress = async (): Promise<WeeklyProgressData> => {
  try {
    const data = await apiGet<WeeklyProgressData>('/chat/weekly-progress')
    const normalized: WeeklyProgressData = {
      rangeStart: data?.rangeStart || '',
      rangeEnd: data?.rangeEnd || '',
      totalSessions: Number(data?.totalSessions || 0),
      totalQuestions: Number(data?.totalQuestions || 0),
      days: Array.isArray(data?.days) ? data.days : [],
    }
    const hasAnyData = normalized.totalSessions > 0 || normalized.totalQuestions > 0 || normalized.days.some((item) => Number(item?.questions || 0) > 0 || Number(item?.sessions || 0) > 0)
    if (hasAnyData) return normalized
  } catch {
    // fall through to fallback
  }

  return buildWeeklyProgressFallback()
}

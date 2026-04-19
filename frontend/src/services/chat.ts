import Taro from '@tarojs/taro'
import { apiDelete, apiGet, apiPost } from './api'
import { getAppSettings } from './settings'
import { ChatMessage, ChatSession, CompletionPayload, FaqQuestionItem, UserProfile } from '@/types/chat'

interface StreamState {
  buffer: string
  full: string
}

const decodeResponseText = (value: unknown): string => {
  if (typeof value === 'string') return value
  return value ? String(value) : ''
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

export const listUsers = async (): Promise<UserProfile[]> => {
  return apiGet<UserProfile[]>('/user')
}

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const settings = getAppSettings()
  if (!settings.userId) return null
  const users = await listUsers()
  return users.find((u) => u.id === settings.userId) || null
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

export const speechRecognizeByFile = async (tempFilePath: string, model = 'whisper-1') => {
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

export const listQuickQuestions = async (limit = 4): Promise<string[]> => {
  const items = await listFaqQuestions(limit)
  return items.map((item) => item.question).filter(Boolean)
}

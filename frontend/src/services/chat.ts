import Taro from '@tarojs/taro'
import { apiDelete, apiGet, apiPost } from './api'
import { getAppSettings } from './settings'
import { ChatMessage, ChatSession, CompletionPayload, UserProfile } from '../types/chat'

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

export const login = async (userId: string, password: string): Promise<string> => {
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
): Promise<string> => {
  const settings = getAppSettings()
  const baseUrl = settings.baseUrl.trim().replace(/\/$/, '')
  const token = settings.token.trim()

  if (!baseUrl || !token) {
    throw new Error('请先在“我的”页完成后端配置并登录')
  }

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

    requestTask?.onChunkReceived?.((event: any) => {
      const text = decodeResponseText(event?.data)
      consumeSSEText(text, state, onDelta)
    })
  })
}

export const getQuickQuestions = (): string[] => [
  '当前玉米叶片发黄，可能是什么原因？',
  '小麦返青期施肥方案怎么定？',
  '番茄晚疫病如何预防？',
  '近期阴雨天，蔬菜大棚该怎么管理？',
]

export const getFaqList = () => [
  {
    id: 'faq-1',
    title: '玉米黄叶诊断思路',
    question: '玉米叶片发黄的常见原因有哪些，如何快速排查？',
    answer:
      '优先看分布和部位：整田普遍发黄常见缺肥或渍害；局部点片状发黄要排查病虫害。再结合根系、土壤湿度和近期施肥记录做判断。',
  },
  {
    id: 'faq-2',
    title: '小麦返青管理',
    question: '小麦返青期怎样施肥更稳妥？',
    answer:
      '返青期强调“促弱控旺”。弱苗田可适度前移追肥，旺苗田适度后移并控氮，关注倒春寒前后温度变化，避免一次性重施。',
  },
  {
    id: 'faq-3',
    title: '番茄晚疫病预防',
    question: '番茄晚疫病怎么做预防？',
    answer:
      '优先改善通风降湿，雨前做好保护性喷药，发病初期及时轮换不同作用机制药剂，避免长期单一药剂。',
  },
]

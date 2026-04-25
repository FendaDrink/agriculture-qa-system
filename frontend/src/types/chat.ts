export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ChatSession {
  id: string
  title: string
  createBy: string
  status: number
  createTime: string
  updateTime: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  sender: 0 | 1
  content: string
  createTime: string
  status: number
  extra?: Record<string, unknown>
}

export interface MessageSourceItem {
  index?: number
  documentId: string
  fileName: string
  fileHash?: string
  collectionId?: string
  chunkId?: string
  score?: number
}

export interface CompletionPayload {
  query: string
  model?: string
  sessionId: string
  history?: any
}

export interface UserProfile {
  id: string
  username: string
  city?: number
  roleId: number
  status: number
  createTime: string
  updateTime: string
}

export interface AppSettings {
  baseUrl: string
  token: string
  userId: string
  model: string
  username: string
}

export interface FaqQuestionItem {
  id: string
  question: string
  source: 'manual' | 'auto'
  frequency?: number | null
  latestAskedAt?: string | null
}

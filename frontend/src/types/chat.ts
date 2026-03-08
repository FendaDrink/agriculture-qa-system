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

export interface CompletionPayload {
  query: string
  model?: string
  collectionId?: string
  sessionId: string
}

export interface UserProfile {
  id: string
  username: string
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
  collectionId: string
}

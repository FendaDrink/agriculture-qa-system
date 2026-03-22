import api from './client'

export interface RecallParams {
  query: string
  collectionId: string
  topN?: number
}

export interface RecallItem {
  id: string
  content: string
  distance?: number
  score?: number
}

export interface RecallResponse {
  items: RecallItem[]
}

export const recallChunks = (data: RecallParams) => api.post<RecallResponse>('/database/recall', data)

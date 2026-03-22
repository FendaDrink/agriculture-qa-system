import api from './client'
import type { ChunkDetailDto } from '../types/api'

export interface AddChunkParams {
  content: string
  collectionId: string
  documentId: string
  user: string
}

export interface UpdateChunkParams {
  id: string
  content: string
  collectionId: string
  documentId: string
  user: string
}

export interface DeleteChunkParams {
  id: string
  collectionId: string
  documentId: string
}

export const getChunks = (documentId: string) =>
  api.get<ChunkDetailDto[]>('/database/chunk', { params: { documentId } })

export const addChunk = (data: AddChunkParams) => api.post<ChunkDetailDto>('/database/chunk', data)

export const updateChunk = (data: UpdateChunkParams) =>
  api.patch<ChunkDetailDto>('/database/chunk', data)

export const deleteChunk = (data: DeleteChunkParams) => api.delete<void>('/database/chunk', { data })

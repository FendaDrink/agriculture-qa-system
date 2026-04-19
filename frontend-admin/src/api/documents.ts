import api from './client'
import type { DocumentDto } from '../types/api'

export interface UpdateDocumentParams {
  id: string
  fileName: string
  collectionId: string
  createBy: string
}

export interface ChunkStrategyParams {
  chunkRule: 'semantic_hybrid' | 'sentence_pack' | 'title_structure' | 'fixed_window'
  chunkSize: number
  chunkOverlap: number
  minChunkSize: number
}

export const getDocumentsByCollection = (collectionId: string) =>
  api.get<DocumentDto[]>('/database/document/search', { params: { collectionId } })

export const uploadDocument = (
  params: { collectionId: string; user: string; fileName?: string } & ChunkStrategyParams,
  file: File,
  options?: { onUploadProgress?: (progressEvent: ProgressEvent) => void },
) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<void>('/database/document', formData, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options?.onUploadProgress,
  })
}

export const updateDocument = (data: UpdateDocumentParams) =>
  api.patch<DocumentDto>('/database/document', data)

export const deleteDocument = (id: string) =>
  api.delete<void>('/database/document', { params: { id } })

export interface ChunkPreviewResult {
  summary: {
    file_name: string
    chunk_rule: string
    chunk_size: number
    chunk_overlap: number
    min_chunk_size: number
    total_chunks: number
    avg_length: number
    min_length: number
    max_length: number
  }
  preview_chunks: string[]
}

export const previewDocumentChunks = (
  params: { collectionId: string; user: string; fileName?: string } & ChunkStrategyParams,
  file: File,
) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ChunkPreviewResult>('/database/document/preview-chunks', formData, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

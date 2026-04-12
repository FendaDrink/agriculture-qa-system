import api from './client'
import type { DocumentDto } from '../types/api'

export interface UpdateDocumentParams {
  id: string
  fileName: string
  collectionId: string
  createBy: string
}

export const getDocumentsByCollection = (collectionId: string) =>
  api.get<DocumentDto[]>('/database/document/search', { params: { collectionId } })

export const uploadDocument = (
  params: { collectionId: string; user: string; fileName?: string },
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

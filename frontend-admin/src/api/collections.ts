import api from './client'
import type { CollectionDto } from '../types/api'

export interface CreateCollectionParams {
  collectionName: string
  createBy: string
  city?: number
}

export interface UpdateCollectionParams {
  id: string
  collectionName: string
  createBy: string
  city?: number
}

export const getCollections = () => api.get<CollectionDto[]>('/database')

export const searchCollections = (params: { createBy?: string }) =>
  api.get<CollectionDto[]>('/database/search', { params })

export const createCollection = (data: CreateCollectionParams) =>
  api.post<CollectionDto>('/database', data)

export const updateCollection = (data: UpdateCollectionParams) =>
  api.patch<CollectionDto>('/database', data)

export const deleteCollection = (collectionId: string) =>
  api.delete<void>('/database', { params: { collectionId } })

import api from './client'

export interface FaqListItem {
  id: string
  question: string
  source: 'manual' | 'auto'
  frequency?: number | null
  latestAskedAt?: string | null
}

export interface ManualFaqItem {
  id: string
  question: string
  originQuestion?: string | null
  status: number
  sortNo: number
  createBy?: string | null
  updateBy?: string | null
  createTime: string
  updateTime: string
}

export interface PagedFaqResult {
  items: ManualFaqItem[]
  total: number
  page: number
  pageSize: number
}

export interface ListManualFaqParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}

export interface CreateManualFaqParams {
  question: string
  originQuestion?: string
  status?: number
  sortNo?: number
}

export interface UpdateManualFaqParams {
  id: string
  question?: string
  originQuestion?: string
  status?: number
  sortNo?: number
}

export interface OverrideFaqParams {
  originQuestion: string
  question: string
  status?: number
  sortNo?: number
}

export const getHighFrequencyFaqs = (limit = 20) =>
  api.get<{ items: FaqListItem[] }>('/faq/high-frequency', { params: { limit } })

export const getManualFaqs = (params: ListManualFaqParams) =>
  api.get<PagedFaqResult>('/faq/admin', { params })

export const createManualFaq = (data: CreateManualFaqParams) =>
  api.post<ManualFaqItem>('/faq/admin', data)

export const updateManualFaq = ({ id, ...data }: UpdateManualFaqParams) =>
  api.patch<ManualFaqItem>(`/faq/admin/${id}`, data)

export const deleteManualFaq = (id: string) =>
  api.delete<void>(`/faq/admin/${id}`)

export const overrideHighFrequencyFaq = (data: OverrideFaqParams) =>
  api.post<ManualFaqItem>('/faq/admin/override', data)

import api from './client'

export interface RequestLogListItem {
  id: string
  createTime: string
  source: 'backend' | 'algorithm'
  clientApp?: string | null
  requestId?: string | null
  method: string
  path: string
  originalUrl: string
  statusCode: number
  durationMs: number
  ip?: string | null
  userAgent?: string | null
  referer?: string | null
  userId?: string | null
  roleId?: number | null
  errorMessage?: string | null
}

export interface RequestLogDetail extends RequestLogListItem {
  headers?: string | null
  query?: string | null
  body?: string | null
  errorStack?: string | null
}

export interface LogListResponse {
  items: RequestLogListItem[]
  total: number
  page: number
  pageSize: number
}

export interface LogsMetricsResponse {
  total: number
  error: number
  errorRate: number
  avgDurationMs: number
  p95DurationMs: number
  topEndpoints: { method: string; path: string; count: number }[]
  slowEndpoints: { method: string; path: string; avg: number }[]
  recentErrors: RequestLogListItem[]
}

export const getLogs = (params: Record<string, any>) => {
  return api.get<LogListResponse>('/logs', { params })
}

export const getLogDetail = (id: string) => {
  return api.get<RequestLogDetail>(`/logs/${id}`)
}

export const getLogsMetrics = (params: Record<string, any>) => {
  return api.get<LogsMetricsResponse>('/logs/metrics', { params })
}


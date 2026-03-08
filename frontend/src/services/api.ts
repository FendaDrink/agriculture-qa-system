import Taro from '@tarojs/taro'
import { ApiResponse } from '../types/chat'
import { getAppSettings } from './settings'

const buildUrl = (baseUrl: string, path: string, query?: Record<string, unknown>): string => {
  const cleanedBaseUrl = baseUrl.trim().replace(/\/$/, '')
  if (!query || Object.keys(query).length === 0) return `${cleanedBaseUrl}${path}`

  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

  if (!search) return `${cleanedBaseUrl}${path}`
  return `${cleanedBaseUrl}${path}?${search}`
}

const request = async <T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  data?: Record<string, unknown>,
): Promise<T> => {
  const settings = getAppSettings()
  const baseUrl = settings.baseUrl.trim()
  const token = settings.token.trim()

  if (!baseUrl) {
    throw new Error('请先在“我的”页配置后端地址')
  }

  const needsQueryInUrl = method === 'GET' || method === 'DELETE'
  const url = buildUrl(baseUrl, path, needsQueryInUrl ? data : undefined)

  const res = await Taro.request<ApiResponse<T>>({
    url,
    method,
    data: needsQueryInUrl ? undefined : data,
    header: {
      'Content-Type': 'application/json',
      Authorization:  token ? `Bearer ${token}` : '',
    },
  })

  if (res.statusCode >= 400) {
    throw new Error(res.data?.message || `请求失败：${res.statusCode}`)
  }

  if (!res.data || typeof res.data !== 'object' || !('data' in res.data)) {
    throw new Error('后端返回格式不符合预期')
  }

  return res.data.data
}

export const apiGet = <T>(path: string, query?: Record<string, unknown>) => {
  return request<T>(path, 'GET', query)
}

export const apiPost = <T>(path: string, body?: Record<string, unknown>) => {
  return request<T>(path, 'POST', body)
}

export const apiPatch = <T>(path: string, body?: Record<string, unknown>) => {
  return request<T>(path, 'PATCH', body)
}

export const apiDelete = <T>(path: string, query?: Record<string, unknown>) => {
  return request<T>(path, 'DELETE', query)
}

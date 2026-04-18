import Taro from '@tarojs/taro'
import { ApiResponse } from '@/types/chat'
import {getAppSettings, saveAppSettings} from './settings'

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
  data?: Record<string, any>,
): Promise<T> => {
  const settings = getAppSettings()
  const baseUrl = settings.baseUrl.trim()
  const token = settings.token.trim()
  const url = buildUrl(baseUrl, path, data)

  const res = await Taro.request<ApiResponse<T>>({
    url,
    method,
    data,
    header: {
      'Content-Type': 'application/json',
      'X-Client-App': 'frontend',
      Authorization:  token ? `Bearer ${token}` : '',
    },
  })
  if (res.data.code >= 400) {
    if (res.data.code === 401) {
      saveAppSettings({
        ...settings,
        token: '',
      })
    }
    throw new Error(res.data?.message || '服务器出错了，请稍后再试～')
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

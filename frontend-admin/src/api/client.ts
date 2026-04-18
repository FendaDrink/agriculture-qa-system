import axios, { AxiosError } from 'axios'
import { message } from 'antd'
import { clearAuth, getAuthToken } from '../utils/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 1000000,
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  // Identify admin client for backend logs.
  // @ts-ignore
  config.headers = {
    ...config.headers,
    'X-Client-App': 'admin',
  }
  if (token) {
    // @ts-ignore
    config.headers = {
      ...config.headers,
      'X-Client-App': 'admin',
      Authorization: `Bearer ${token}`,
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const payload = response.data
    if (payload?.code !== 200) {
      return Promise.reject(new Error(payload?.message || '请求失败'))
    }
    return payload.data
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuth()
      message.error('登录失效，请重新登录')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api

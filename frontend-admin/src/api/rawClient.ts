import axios, { AxiosError } from 'axios'
import { message } from 'antd'
import { clearAuth, getAuthToken } from '../utils/auth'

const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 1000000,
})

rawApi.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    // @ts-ignore
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }
  return config
})

rawApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuth()
      message.error('登录失效，请重新登录')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default rawApi


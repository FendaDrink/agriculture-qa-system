import Taro from '@tarojs/taro'
import { AppSettings } from '@/types/chat'

const SETTINGS_KEY = 'agri:app:settings'

const defaults: AppSettings = {
  baseUrl: 'http://localhost:3000',
  token: '',
  userId: '',
  model: 'chatgpt-4o-latest',
  username: '',
}

export const getAppSettings = (): AppSettings => {
  const saved = Taro.getStorageSync(SETTINGS_KEY)
  return {
    ...defaults,
    ...(saved || {}),
  }
}

export const saveAppSettings = (settings: Partial<AppSettings>): AppSettings => {
  const next = {
    ...getAppSettings(),
    ...settings,
  }
  Taro.setStorageSync(SETTINGS_KEY, next)
  return next
}

export const clearAppSettings = () => {
  Taro.removeStorageSync(SETTINGS_KEY)
}

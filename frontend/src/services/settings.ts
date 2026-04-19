import Taro from '@tarojs/taro'
import { AppSettings } from '@/types/chat'

const SETTINGS_KEY = 'agri:app:settings'

const defaults: AppSettings = {
  baseUrl: 'http://localhost:3000',
  token: '',
  userId: '',
  model: 'gpt-3.5-turbo-1106',
  collectionId: '28b0f5cc_武汉市知识库',
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

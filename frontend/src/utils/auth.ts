import Taro from '@tarojs/taro'
import { getAppSettings } from '../services/settings'

export const ensureAuthed = () => {
  const { token } = getAppSettings()
  if (!token) {
    const current = Taro.getCurrentPages()?.slice(-1)[0]
    const route = (current as any)?.route || ''
    if (!route.includes('pages/login') && !route.includes('pages/home')) {
      Taro.navigateTo({ url: '/pages/login/index' })
      return false
    }
  }
  return true
}

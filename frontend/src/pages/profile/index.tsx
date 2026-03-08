import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useState } from 'react'
import { getCurrentUser } from '../../services/chat'
import { getAppSettings, saveAppSettings } from '../../services/settings'
import { ensureAuthed } from '../../utils/auth'
import './index.scss'

const ProfilePage = () => {
  const [settings, setSettings] = useState(getAppSettings())
  const [userName, setUserName] = useState('')
  const loggedIn = Boolean(settings.token && settings.userId)

  const sync = async () => {
    const next = getAppSettings()
    setSettings(next)
    try {
      const user = await getCurrentUser()
      setUserName(user?.username || '')
    } catch {
      setUserName('')
    }
  }

  useDidShow(() => {
    if (!ensureAuthed()) return
    sync()
  })

  const logout = () => {
    saveAppSettings({ token: '', userId: '' })
    setSettings(getAppSettings())
    setUserName('')
    Taro.showToast({ title: '已退出登录', icon: 'none' })
    Taro.switchTab({ url: '/pages/home/index' })
  }

  return (
    <View className='profile-page'>
      {!loggedIn && (
        <View className='notice'>
          <Text className='notice-title'>未登录</Text>
          <Text className='notice-desc'>前往登录页输入后端地址、用户ID与密码以获取访问权限。</Text>
          <Button
            className='login-shortcut'
            size='mini'
            onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}
          >
            去登录
          </Button>
        </View>
      )}
      <View className='profile-card'>
        <Text className='profile-title'>个人信息</Text>
        <Text className='field-label'>用户ID</Text>
        <Text className='field-value'>{settings.userId || '未登录'}</Text>
        <Text className='field-label'>昵称</Text>
        <Text className='field-value'>{userName || '未登录'}</Text>
        <Text className='field-label'>后端地址</Text>
        <Text className='field-value'>{settings.baseUrl || '未配置'}</Text>
      </View>

      {loggedIn && (
        <View className='profile-card'>
          <Button className='logout-btn' onClick={logout}>
            退出登录
          </Button>
        </View>
      )}
    </View>
  )
}

export default ProfilePage

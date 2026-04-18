import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useState } from 'react'
import { getAppSettings, saveAppSettings } from '@/services/settings'
import { ensureAuthed } from '@/utils/auth'
import './index.scss'

const ProfilePage = () => {
  const [settings, setSettings] = useState(getAppSettings())
  const loggedIn = Boolean(settings.token && settings.userId && settings.username)

  const sync = () => {
    const info = getAppSettings()
    setSettings(info)
  }

  useDidShow(() => {
    if (!ensureAuthed()) return
    sync()
  })

  const logout = async() => {
    saveAppSettings({ token: '', userId: '', username: '' })
    setSettings(getAppSettings())
    await Taro.showToast({ title: '已退出登录', icon: 'none' })
    await Taro.switchTab({ url: '/pages/home/index' })
  }

  return (
    <View className='profile-page safe-shell'>
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
        <Text className='field-value'>{settings.userId}</Text>
        <Text className='field-label'>昵称</Text>
        <Text className='field-value'>{settings.username}</Text>
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

import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useState } from 'react'
import { login } from '../../services/chat'
import { getAppSettings, saveAppSettings } from '../../services/settings'
import './index.scss'

const LoginPage = () => {
  const preset = getAppSettings()
  const [baseUrl, setBaseUrl] = useState(preset.baseUrl)
  const [userId, setUserId] = useState(preset.userId)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    if (!baseUrl.trim() || !userId.trim() || !password.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const token = await login(userId.trim(), password.trim())
      saveAppSettings({ baseUrl: baseUrl.trim(), userId: userId.trim(), token })
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setPassword('')
      Taro.switchTab({ url: '/pages/chat/index' })
    } catch (err) {
      Taro.showToast({ title: (err as Error).message || '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <Text className='title'>农业智能问答助手</Text>
      <View className='form'>
        <Text className='label'>后端地址</Text>
        <Input
          className='input'
          value={baseUrl}
          onInput={(e) => setBaseUrl(e.detail.value)}
          placeholder='http://localhost:3000'
        />

        <Text className='label'>用户ID（手机号）</Text>
        <Input
          className='input'
          value={userId}
          onInput={(e) => setUserId(e.detail.value)}
          placeholder='请输入用户ID'
        />

        <Text className='label'>密码</Text>
        <Input
          className='input'
          password
          value={password}
          onInput={(e) => setPassword(e.detail.value)}
          placeholder='请输入密码'
        />

        <Button className='login-btn' loading={loading} onClick={onSubmit}>
          登录
        </Button>
      </View>
    </View>
  )
}

export default LoginPage

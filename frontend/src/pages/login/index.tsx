import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useState } from 'react'
import { login } from '@/services/chat'
import { getAppSettings, saveAppSettings } from '@/services/settings'
import { parseBearerTokenPayload } from '@/utils/auth'
import './index.scss'

const LoginPage = () => {
  const preset = getAppSettings()
  const [userId, setUserId] = useState(preset.userId)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    if (!userId.trim() || !password.trim()) {
      await Taro.showToast({ title: '请输入完整信息', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const token = await login(userId.trim(), password.trim())
      const payload = parseBearerTokenPayload(token)
      console.log(payload, 'gogoing')
      saveAppSettings({ userId: userId.trim(), token, username: payload.username })
      await Taro.showToast({ title: '登录成功', icon: 'success' })
      setPassword('')
      await Taro.switchTab({ url: '/pages/chat/index' })
    } catch (err) {
      console.log(err)
      await Taro.showToast({ title: (err as Error).message || '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page safe-shell safe-top'>
      <View className='hero'>
        <Text className='hero-badge'>湖北农业 AI</Text>
        <Text className='title'>农业智能问答助手</Text>
        <Text className='subtitle'>登录后可使用病虫害诊断、种植问答与知识库检索能力</Text>
      </View>
      <View className='form'>
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

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
        <Text className='hero-badge'>湖北农业问答</Text>
        <Text className='title'>湖北省农业问答助手</Text>
        <Text className='subtitle'>登录后可查看提问记录、待办事项，并继续此前的咨询内容</Text>

      </View>
      <View className='form'>
        <View className='form-head'>
          <Text className='form-kicker'>账号登录</Text>
          <Text className='form-title'>登录后即可开始使用</Text>
        </View>
        <Text className='label'>账号</Text>
        <Input
          className='input'
          value={userId}
          onInput={(e) => setUserId(e.detail.value)}
          placeholder='请输入手机号'
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
        <Button
          className='register-btn'
          disabled={loading}
          onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}
        >
          还没有账号？去注册
        </Button>
        <Text className='form-tip soft'>建议使用手机号登录，系统会根据所在城市提供更合适的参考内容。</Text>
      </View>
    </View>
  )
}

export default LoginPage

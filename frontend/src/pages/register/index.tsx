import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useState } from 'react'
import { register } from '@/services/chat'
import { getAppSettings, saveAppSettings } from '@/services/settings'
import { HUBEI_CITY_OPTIONS } from '@/constants/city'
import './index.scss'

const RegisterPage = () => {
  const preset = getAppSettings()
  const [userId, setUserId] = useState('')
  const [username, setUsername] = useState('')
  const [cityCode, setCityCode] = useState(1)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    const id = userId.trim()
    const name = username.trim()
    const pwd = password.trim()
    const confirmPwd = confirmPassword.trim()
    const city = Number(cityCode) || 1

    if (!id || !name || !pwd || !confirmPwd) {
      await Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(id)) {
      await Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (pwd.length < 6) {
      await Taro.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (pwd !== confirmPwd) {
      await Taro.showToast({ title: '两次密码输入不一致', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await register({
        id,
        username: name,
        city,
        password: pwd,
      })
      saveAppSettings({
        userId: id,
        username: name,
        baseUrl: preset.baseUrl,
      })
      await Taro.showToast({ title: '注册成功，请登录', icon: 'success' })
      setPassword('')
      setConfirmPassword('')
      await Taro.redirectTo({ url: '/pages/login/index' })
    } catch (err) {
      await Taro.showToast({ title: (err as Error).message || '注册失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const cityIndex = Math.max(0, HUBEI_CITY_OPTIONS.findIndex((item) => item.code === cityCode))
  const cityRange = HUBEI_CITY_OPTIONS.map((item) => item.name)

  return (
    <View className='register-page safe-shell safe-top'>
      <View className='hero'>
        <Text className='hero-badge'>湖北农业问答</Text>
        <Text className='title'>注册账号后即可使用</Text>
        <Text className='subtitle'>完成注册后可登录提问，也可记录日常农事待办</Text>
        <View className='hero-chips'>
          <Text className='hero-chip'>按城市匹配</Text>
          <Text className='hero-chip'>常见问题可查</Text>
          <Text className='hero-chip'>农事待办可记录</Text>
        </View>
      </View>

      <View className='form'>
        <View className='form-head'>
          <Text className='form-kicker'>账号注册</Text>
          <Text className='form-title'>请填写完整信息</Text>
        </View>
        <Text className='label'>手机号</Text>
        <Input
          className='input'
          value={userId}
          type='number'
          maxlength={11}
          onInput={(e) => setUserId(e.detail.value)}
          placeholder='请输入11位手机号'
        />

        <Text className='label'>昵称</Text>
        <Input
          className='input'
          value={username}
          maxlength={20}
          onInput={(e) => setUsername(e.detail.value)}
          placeholder='请输入昵称'
        />

        <Text className='label'>所在城市</Text>
        <Picker
          mode='selector'
          range={cityRange}
          value={cityIndex}
          onChange={(e) => {
            const idx = Number((e as any).detail?.value)
            setCityCode(HUBEI_CITY_OPTIONS[idx]?.code || 1)
          }}
        >
          <View className='picker-input'>
            <Text>{HUBEI_CITY_OPTIONS[cityIndex]?.name || '武汉市'}</Text>
          </View>
        </Picker>

        <Text className='label'>密码</Text>
        <Input
          className='input'
          value={password}
          password
          onInput={(e) => setPassword(e.detail.value)}
          placeholder='至少6位'
        />

        <Text className='label'>确认密码</Text>
        <Input
          className='input'
          value={confirmPassword}
          password
          onInput={(e) => setConfirmPassword(e.detail.value)}
          placeholder='请再次输入密码'
        />

        <Button className='register-btn' loading={loading} onClick={onSubmit}>
          注册
        </Button>
        <Button className='back-btn' disabled={loading} onClick={() => Taro.navigateBack()}>
          返回登录
        </Button>
        <Text className='form-tip'>注册完成后会跳转登录页，你可以直接开始提问。</Text>
        <Text className='form-tip soft'>所在城市会影响资料匹配，建议按实际情况选择。</Text>
      </View>
    </View>
  )
}

export default RegisterPage

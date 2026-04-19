import { Button, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useState } from 'react'
import { getCurrentUser, listQuickQuestions, listSessions } from '@/services/chat'
import { clearAppSettings, getAppSettings, saveAppSettings } from '@/services/settings'
import { ensureAuthed } from '@/utils/auth'
import './index.scss'

const ProfilePage = () => {
  const [settings, setSettings] = useState(getAppSettings())
  const [sessionCount, setSessionCount] = useState(0)
  const [recommendCount, setRecommendCount] = useState(0)
  const [roleName, setRoleName] = useState('普通用户')
  const [city, setCity] = useState('-')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const loggedIn = Boolean(settings.token && settings.userId && settings.username)

  const sync = async () => {
    const info = getAppSettings()
    setSettings(info)
    if (!info.userId || !info.token) {
      setSessionCount(0)
      setRecommendCount(0)
      setRoleName('普通用户')
      setCity('-')
      return
    }
    try {
      const [user, sessions, recommend] = await Promise.all([
        getCurrentUser().catch(() => null),
        listSessions().catch(() => []),
        listQuickQuestions(20).catch(() => []),
      ])
      setSessionCount(sessions.length)
      setRecommendCount(recommend.length)
      setRoleName(user?.roleId === 0 ? '超级管理员' : user?.roleId === 1 ? '管理员' : '普通用户')
      setCity(user?.city || '-')
    } catch {
      // ignore
    }
  }

  useDidShow(() => {
    ;(async () => {
      if (!await ensureAuthed()) return
      await sync()
    })()
  })

  const logout = async() => {
    saveAppSettings({ token: '', userId: '', username: '' })
    setSettings(getAppSettings())
    setSessionCount(0)
    setRecommendCount(0)
    await Taro.showToast({ title: '已退出登录', icon: 'none' })
    await Taro.switchTab({ url: '/pages/home/index' })
  }

  const saveConnection = async () => {
    if (!settings.baseUrl.trim()) {
      await Taro.showToast({ title: '后端地址不能为空', icon: 'none' })
      return
    }
    if (!/^https?:\/\//i.test(settings.baseUrl.trim())) {
      await Taro.showToast({ title: '后端地址需以 http/https 开头', icon: 'none' })
      return
    }
    setSaving(true)
    saveAppSettings({
      baseUrl: settings.baseUrl.trim(),
      model: settings.model.trim() || 'gpt-3.5-turbo-1106',
      collectionId: settings.collectionId.trim(),
      userId: settings.userId.trim(),
      username: settings.username.trim(),
    })
    setSaving(false)
    await Taro.showToast({ title: '设置已保存', icon: 'none' })
  }

  const testConnection = async () => {
    const baseUrl = settings.baseUrl.trim().replace(/\/$/, '')
    if (!baseUrl) {
      await Taro.showToast({ title: '请先填写后端地址', icon: 'none' })
      return
    }
    setTesting(true)
    try {
      const res = await Taro.request({
        url: `${baseUrl}/health`,
        method: 'GET',
        timeout: 8000,
      })
      if (res.statusCode >= 200 && res.statusCode < 400) {
        await Taro.showToast({ title: '连接成功', icon: 'success' })
      } else {
        await Taro.showToast({ title: `连接失败(${res.statusCode})`, icon: 'none' })
      }
    } catch (error) {
      await Taro.showToast({ title: '连接失败，请检查地址/网络', icon: 'none' })
    } finally {
      setTesting(false)
    }
  }

  const copyToken = async () => {
    if (!settings.token.trim()) {
      await Taro.showToast({ title: '暂无 Token', icon: 'none' })
      return
    }
    await Taro.setClipboardData({ data: settings.token })
    await Taro.showToast({ title: 'Token 已复制', icon: 'none' })
  }

  const resetLocal = async () => {
    const ret = await Taro.showModal({
      title: '清空本地设置',
      content: '将清空本地地址、模型、用户和登录信息，是否继续？',
      confirmText: '确认',
      cancelText: '取消',
    })
    if (!ret.confirm) return
    clearAppSettings()
    setSettings(getAppSettings())
    setSessionCount(0)
    setRecommendCount(0)
    await Taro.showToast({ title: '已清空', icon: 'none' })
  }

  return (
    <ScrollView scrollY className='profile-page safe-shell'>
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

      <View className='hero-card'>
        <Text className='hero-name'>{settings.username || '未登录用户'}</Text>
        <Text className='hero-meta'>ID：{settings.userId || '-'}</Text>
        <Text className='hero-meta'>角色：{roleName} · 城市：{city}</Text>
      </View>

      <View className='stats-row'>
        <View className='stat-item'>
          <Text className='stat-value'>{sessionCount}</Text>
          <Text className='stat-label'>我的会话</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-value'>{recommendCount}</Text>
          <Text className='stat-label'>可用引导题</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-value'>{loggedIn ? '已登录' : '未登录'}</Text>
          <Text className='stat-label'>当前状态</Text>
        </View>
      </View>

      <View className='profile-card'>
        <Text className='profile-title'>快捷入口</Text>
        <View className='action-row'>
          <Button className='action-btn' size='mini' onClick={() => Taro.switchTab({ url: '/pages/chat/index' })}>去问答</Button>
          <Button className='action-btn' size='mini' onClick={() => Taro.switchTab({ url: '/pages/faq/index' })}>看高频问题</Button>
          <Button className='action-btn' size='mini' onClick={() => Taro.navigateTo({ url: '/pages/sessions/index' })}>会话管理</Button>
        </View>
      </View>

      <View className='profile-card'>
        <Text className='profile-title'>连接与模型设置</Text>
        <Text className='field-label'>后端地址</Text>
        <Input
          className='field-input'
          value={settings.baseUrl}
          onInput={(e) => setSettings((prev) => ({ ...prev, baseUrl: e.detail.value }))}
          placeholder='http://192.168.71.118:3000'
        />
        <Text className='field-label'>默认模型</Text>
        <Input
          className='field-input'
          value={settings.model}
          onInput={(e) => setSettings((prev) => ({ ...prev, model: e.detail.value }))}
          placeholder='gpt-3.5-turbo-1106'
        />
        <Text className='field-label'>默认知识库ID</Text>
        <Input
          className='field-input'
          value={settings.collectionId}
          onInput={(e) => setSettings((prev) => ({ ...prev, collectionId: e.detail.value }))}
          placeholder='kb_xxx'
        />
        <View className='action-row'>
          <Button className='action-btn primary' size='mini' loading={saving} onClick={saveConnection}>保存设置</Button>
          <Button className='action-btn' size='mini' loading={testing} onClick={testConnection}>测试连接</Button>
        </View>
      </View>

      <View className='profile-card'>
        <Text className='profile-title'>账号与安全</Text>
        <Text className='field-label'>用户ID</Text>
        <Input
          className='field-input'
          value={settings.userId}
          onInput={(e) => setSettings((prev) => ({ ...prev, userId: e.detail.value }))}
          placeholder='请输入用户ID'
        />
        <Text className='field-label'>昵称</Text>
        <Input
          className='field-input'
          value={settings.username}
          onInput={(e) => setSettings((prev) => ({ ...prev, username: e.detail.value }))}
          placeholder='登录后自动填充'
        />
        <Text className='field-label'>Token</Text>
        <Text className='token-box'>{showToken ? (settings.token || '-') : (settings.token ? '••••••••••••••••' : '-')}</Text>
        <View className='action-row'>
          <Button className='action-btn' size='mini' onClick={() => setShowToken((v) => !v)}>{showToken ? '隐藏Token' : '显示Token'}</Button>
          <Button className='action-btn' size='mini' onClick={copyToken}>复制Token</Button>
          {!loggedIn ? (
            <Button className='action-btn primary' size='mini' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>去登录</Button>
          ) : null}
        </View>
      </View>

      <View className='profile-card'>
        <Text className='profile-title'>数据与退出</Text>
        <View className='action-row'>
          <Button className='action-btn warn' size='mini' onClick={resetLocal}>清空本地设置</Button>
          {loggedIn ? (
            <Button className='action-btn danger' size='mini' onClick={logout}>退出登录</Button>
          ) : null}
        </View>
      </View>

    </ScrollView>
  )
}

export default ProfilePage

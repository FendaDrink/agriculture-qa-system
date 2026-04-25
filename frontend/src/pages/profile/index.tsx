import { Button, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useMemo, useState } from 'react'
import {
  getCurrentUser,
  getWeeklyProgress,
  listQuickQuestions,
  listSessions,
  updateCurrentUser,
  WeeklyProgressData,
} from '@/services/chat'
import { getTodayDateString, listTodayTodos } from '@/services/todo'
import { getAppSettings, saveAppSettings } from '@/services/settings'
import { ChatSession } from '@/types/chat'
import { getCityNameByCode, HUBEI_CITY_OPTIONS } from '@/constants/city'
import './index.scss'

const ACTIVE_SESSION_KEY = 'agri:chat:active-session-id'

const emptyProgress: WeeklyProgressData = {
  rangeStart: '',
  rangeEnd: '',
  totalSessions: 0,
  totalQuestions: 0,
  days: [],
}

const formatTime = (value?: string) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

const ProfilePage = () => {
  const [settings, setSettings] = useState(getAppSettings())
  const [sessionCount, setSessionCount] = useState(0)
  const [recommendCount, setRecommendCount] = useState(0)
  const [roleName, setRoleName] = useState('普通用户')
  const [city, setCity] = useState('-')
  const [cityCode, setCityCode] = useState(1)
  const [updatingCity, setUpdatingCity] = useState(false)
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressData>(emptyProgress)
  const [todayTodoTotal, setTodayTodoTotal] = useState(0)
  const [todayTodoDone, setTodayTodoDone] = useState(0)
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([])
  const loggedIn = Boolean(settings.token && settings.userId && settings.username)
  const cityRange = HUBEI_CITY_OPTIONS.map((item) => item.name)
  const cityIndex = Math.max(0, HUBEI_CITY_OPTIONS.findIndex((item) => item.code === cityCode))

  const progressRate = useMemo(() => {
    if (!todayTodoTotal) return 0
    return Math.min(100, Math.round((todayTodoDone / todayTodoTotal) * 100))
  }, [todayTodoDone, todayTodoTotal])

  const sync = async () => {
    const info = getAppSettings()
    setSettings(info)
    if (!info.userId || !info.token) {
      setSessionCount(0)
      setRecommendCount(0)
      setRoleName('普通用户')
      setCity('-')
      setCityCode(1)
      setWeeklyProgress(emptyProgress)
      setTodayTodoTotal(0)
      setTodayTodoDone(0)
      setRecentSessions([])
      return
    }

    const [user, sessions, recommend] = await Promise.all([
      getCurrentUser().catch(() => null),
      listSessions().catch(() => []),
      listQuickQuestions(20).catch(() => []),
    ])

    setSessionCount(sessions.length)
    setRecentSessions(sessions.slice(0, 3))
    setRecommendCount(recommend.length)
    setRoleName(user?.roleId === 0 ? '超级管理员' : user?.roleId === 1 ? '管理员' : '普通用户')
    setCity(getCityNameByCode(user?.city))
    setCityCode(Number(user?.city) || 1)
    const [progress, todos] = await Promise.all([
      getWeeklyProgress().catch(() => emptyProgress),
      listTodayTodos().catch(() => []),
    ])
    setWeeklyProgress(progress)
    setTodayTodoTotal(todos.length)
    setTodayTodoDone(todos.filter((item) => item.done).length)
  }

  useDidShow(() => {
    sync()
  })

  const logout = async () => {
    saveAppSettings({ token: '', userId: '', username: '' })
    setSettings(getAppSettings())
    setSessionCount(0)
    setRecommendCount(0)
    setWeeklyProgress(emptyProgress)
    setTodayTodoTotal(0)
    setTodayTodoDone(0)
    setRecentSessions([])
    await Taro.showToast({ title: '已退出登录', icon: 'none' })
  }

  const openSession = async (sessionId: string) => {
    if (!sessionId) return
    Taro.setStorageSync(ACTIVE_SESSION_KEY, sessionId)
    await Taro.switchTab({ url: '/pages/chat/index' })
  }

  const onChangeCity = async (nextCode: number) => {
    if (!loggedIn) {
      Taro.showToast({ title: '请先登录后再切换城市', icon: 'none' })
      return
    }
    if (!nextCode || nextCode === cityCode || updatingCity) return
    try {
      setUpdatingCity(true)
      const user = await updateCurrentUser({ city: nextCode })
      setCity(getCityNameByCode(user.city))
      setCityCode(Number(user.city) || nextCode)
      await sync()
      await Taro.showToast({ title: '城市已更新', icon: 'none' })
    } catch (error) {
      await Taro.showToast({ title: (error as Error)?.message || '城市更新失败', icon: 'none' })
    } finally {
      setUpdatingCity(false)
    }
  }

  return (
    <ScrollView scrollY className='profile-page safe-shell'>
      <View className='profile-hero'>
        <View className='avatar'>{(settings.username || '农').slice(0, 1)}</View>
        <View className='hero-main'>
          <Text className='hero-name'>{settings.username || '游客'}</Text>
          <Text className='hero-sub'>{loggedIn ? `${roleName} · ${city}` : '登录后可查看个人信息'}</Text>
          {settings.userId && <Text className='hero-id'>ID：{settings.userId || '-'}</Text>}
        </View>
        {loggedIn ? (
          <Picker
            mode='selector'
            range={cityRange}
            value={cityIndex}
            onChange={(e) => {
              const nextIndex = Number((e as any).detail?.value || 0)
              onChangeCity(HUBEI_CITY_OPTIONS[nextIndex]?.code || 1)
            }}
          >
            <View className={`city-switch city-switch-profile ${updatingCity ? 'disabled' : ''}`}>
              <Text className='city-switch-label'>{updatingCity ? '更新中' : '切换城市'}</Text>
            </View>
          </Picker>
        ) : null}
      </View>

      <View className='stats-grid'>
        <View className='stat-card'>
          <Text className='stat-value'>{weeklyProgress.totalQuestions}</Text>
          <Text className='stat-label'>本周提问</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{sessionCount}</Text>
          <Text className='stat-label'>历史会话</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{todayTodoDone}/{todayTodoTotal}</Text>
          <Text className='stat-label'>今日待办</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{recommendCount}</Text>
          <Text className='stat-label'>可用问题</Text>
        </View>
      </View>

      <View className='profile-card'>
        <View className='card-head'>
          <Text className='profile-title'>今天的待办进度</Text>
          <Text className='card-head-meta'>{getTodayDateString()}</Text>
        </View>
        <View className='progress-track'>
          <View className='progress-fill' style={{ width: `${progressRate}%` }} />
        </View>
        <Text className='progress-text'>
          {todayTodoTotal ? `今日已完成 ${todayTodoDone} 项，完成率 ${progressRate}%` : '今日暂无待办事项'}
        </Text>
        <Button className='action-btn primary' size='mini' onClick={() => Taro.switchTab({ url: '/pages/todo/index' })}>
          查看待办
        </Button>
      </View>

      <View className='profile-card'>
        <View className='card-head'>
          <Text className='profile-title'>最近提问记录</Text>
          <Text className='card-head-meta'>点击可继续查看</Text>
        </View>
        {recentSessions.length > 0 ? (
          <View className='session-list'>
            {recentSessions.map((item) => (
              <View key={item.id} className='session-item' onClick={() => openSession(item.id)}>
                <Text className='session-title'>{item.title || '未命名会话'}</Text>
                <Text className='session-time'>更新时间：{formatTime(item.updateTime)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className='empty-text'>暂无提问记录，提交问题后会显示在这里。</Text>
        )}
        <View className='action-row'>
          <Button className='action-btn' size='mini' onClick={() => Taro.navigateTo({ url: '/pages/sessions/index' })}>
            会话管理
          </Button>
          <Button className='action-btn primary' size='mini' onClick={() => Taro.switchTab({ url: '/pages/chat/index' })}>
            去咨询
          </Button>
        </View>
      </View>

      <View className='profile-card accent-card'>
        <View className='card-head'>
          <Text className='profile-title'>这周使用情况</Text>
          <Text className='card-head-meta'>{weeklyProgress.rangeStart || '近7天'}</Text>
        </View>
        <View className='insight-row'>
          <View className='insight-item'>
            <Text className='insight-value'>{weeklyProgress.totalQuestions}</Text>
            <Text className='insight-label'>这周提问</Text>
          </View>
          <View className='insight-item'>
            <Text className='insight-value'>{weeklyProgress.totalSessions}</Text>
            <Text className='insight-label'>会话次数</Text>
          </View>
          <View className='insight-item'>
            <Text className='insight-value'>{progressRate}%</Text>
            <Text className='insight-label'>今日待办完成率</Text>
          </View>
        </View>
      </View>

      <View className='profile-card'>
        <View className='card-head'>
          <Text className='profile-title'>账号管理</Text>
        </View>
        {loggedIn ? (
          <View className='action-row'>
            <Button className='action-btn' size='mini' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>切换账号</Button>
            <Button className='action-btn danger' size='mini' onClick={logout}>退出登录</Button>
          </View>
        ) : (
          <View className='action-row'>
            <Button className='action-btn primary' size='mini' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>去登录</Button>
            <Button className='action-btn' size='mini' onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}>去注册</Button>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default ProfilePage

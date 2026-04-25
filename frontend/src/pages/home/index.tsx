import { Swiper, SwiperItem, Text, View, Image, Button, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useState } from 'react'
import {
  getCurrentUser,
  getWeeklyProgress,
  listQuickQuestions,
  QuickQuestionItem,
  updateCurrentUser,
  WeeklyProgressData,
} from '@/services/chat'
import { getAppSettings } from '@/services/settings'
import { getCityNameByCode, HUBEI_CITY_OPTIONS } from '@/constants/city'
import { listTodayTodos, TodoItem } from '@/services/todo'
import './index.scss'

const PREFILL_KEY = 'agri:chat:prefill-question'

const banners = [
  {
    id: 'b1',
    title: '种植问题在线咨询',
    desc: '输入作物情况、症状和天气信息，获取相应处理建议',
    img: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'b2',
    title: '农业资料参考',
    desc: '结合专业农业资料内容，提供更稳妥的问答参考',
    img: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'b3',
    title: '支持语音提问',
    desc: '在田间地头不方便打字时，也可以直接语音输入',
    img: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1200&q=80',
  },
]

const shortcuts = [
  { key: 'qa', title: '在线提问', desc: '病虫害、施肥等问题均可咨询', onClick: () => Taro.switchTab({ url: '/pages/chat/index' }) },
  { key: 'faq', title: '常见问题', desc: '查看常见种植问题和处理思路', onClick: () => Taro.switchTab({ url: '/pages/faq/index' }) },
  { key: 'session', title: '历史记录', desc: '查看以往提问内容', onClick: () => Taro.navigateTo({ url: '/pages/sessions/index' }) },
  { key: 'profile', title: '我的信息', desc: '查看账号和使用情况', onClick: () => Taro.switchTab({ url: '/pages/profile/index' }) },
]

const HomePage = () => {
  const [username, setUsername] = useState('农友')
  const [cityName, setCityName] = useState('湖北省')
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressData>({
    rangeStart: '',
    rangeEnd: '',
    totalSessions: 0,
    totalQuestions: 0,
    days: [],
  })
  const [quickList, setQuickList] = useState<QuickQuestionItem[]>([])
  const [todayTodos, setTodayTodos] = useState<TodoItem[]>([])
  const [cityCode, setCityCode] = useState(1)
  const [updatingCity, setUpdatingCity] = useState(false)
  const maxDailyQuestions = Math.max(1, ...weeklyProgress.days.map((item) => item.questions || 0))
  const cityRange = HUBEI_CITY_OPTIONS.map((item) => item.name)
  const cityIndex = Math.max(0, HUBEI_CITY_OPTIONS.findIndex((item) => item.code === cityCode))

  const syncHome = async () => {
    const settings = getAppSettings()
    const loggedIn = Boolean(settings.token && settings.userId)
    if (!loggedIn) {
      setUsername('农友')
      setCityName('湖北省')
      setCityCode(1)
      setWeeklyProgress({
        rangeStart: '',
        rangeEnd: '',
        totalSessions: 0,
        totalQuestions: 0,
        days: [],
      })
      setQuickList([])
      setTodayTodos([])
      return
    }
    const [user, progress, quick] = await Promise.all([
      getCurrentUser().catch(() => null),
      getWeeklyProgress().catch(() => ({
        rangeStart: '',
        rangeEnd: '',
        totalSessions: 0,
        totalQuestions: 0,
        days: [],
      })),
      listQuickQuestions(4).catch(() => []),
    ])
    const todos = await listTodayTodos().catch(() => [])
    setUsername(user?.username || settings.username || '农友')
    setCityName(getCityNameByCode(user?.city) || '湖北省')
    setCityCode(Number(user?.city) || 1)
    setWeeklyProgress(progress)
    setQuickList(quick)
    setTodayTodos(todos)
  }

  useDidShow(() => {
    syncHome()
  })

  const onQuickAsk = (question: string) => {
    Taro.setStorageSync(PREFILL_KEY, question)
    Taro.switchTab({ url: '/pages/chat/index' })
  }

  const onChangeCity = async (nextCode: number) => {
    const settings = getAppSettings()
    if (!settings.token || !settings.userId) {
      Taro.showToast({ title: '请先登录后再切换城市', icon: 'none' })
      return
    }
    if (!nextCode || nextCode === cityCode || updatingCity) return
    try {
      setUpdatingCity(true)
      const user = await updateCurrentUser({ city: nextCode })
      setCityCode(Number(user.city) || nextCode)
      setCityName(getCityNameByCode(user.city))
      await syncHome()
      await Taro.showToast({ title: '城市已更新', icon: 'none' })
    } catch (error) {
      await Taro.showToast({ title: (error as Error)?.message || '城市更新失败', icon: 'none' })
    } finally {
      setUpdatingCity(false)
    }
  }

  return (
    <View className='home-page safe-shell safe-top'>
      <View className='hero-bar'>
        <Text className='hero-greet'>你好，{username}</Text>
        <View className='hero-badge-row'>
          <Text className='hero-badge'>{cityName} · 农业问答助手</Text>
          {
            getAppSettings().token && <Picker
                mode='selector'
                range={cityRange}
                value={cityIndex}
                onChange={(e) => {
                  const nextIndex = Number((e as any).detail?.value || 0)
                  onChangeCity(HUBEI_CITY_OPTIONS[nextIndex]?.code || 1)
                }}
            >
              <View className={`city-switch ${updatingCity ? 'disabled' : ''}`}>
                <Text className='city-switch-label'>{updatingCity ? '更新中' : '切换城市'}</Text>
              </View>
            </Picker>
          }
        </View>
        <Text className='hero-sub'>围绕病虫害、施肥和日常管理等问题，提供简明实用的参考信息</Text>
      </View>

      <Swiper
        className='home-swiper'
        indicatorDots
        autoplay
        circular
        interval={3000}
        indicatorColor='rgba(255,255,255,0.4)'
        indicatorActiveColor='#0f6a43'
      >
        {banners.map((item) => (
          <SwiperItem key={item.id}>
            <View className='banner'>
              <Image mode='aspectFill' className='banner-img' src={item.img} />
              <View className='banner-mask' />
              <View className='banner-chip-row'>
                <Text className='banner-chip'>{cityName}</Text>
                <Text className='banner-chip light'>农业参考</Text>
              </View>
              <View className='banner-text'>
                <Text className='banner-title'>{item.title}</Text>
                <Text className='banner-desc'>{item.desc}</Text>
                <View className='banner-foot'>
                  <Text className='banner-foot-note'>面向湖北农户提供日常种植参考</Text>
                  <Text className='banner-index'>0{banners.findIndex((banner) => banner.id === item.id) + 1}</Text>
                </View>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      <View className='dashboard-card'>
        <View className='dashboard-main'>
          <Text className='dashboard-title'>本周问答进度</Text>
          <Text className='dashboard-value'>{weeklyProgress.totalQuestions}</Text>
          <Text className='dashboard-desc'>近 7 天累计提问次数</Text>
          <View className='weekly-chart'>
            {weeklyProgress.days.map((item) => (
                <View key={item.date} className='chart-col'>
                  <View className='chart-bar-track'>
                    <View
                        className='chart-bar-fill'
                        style={{ height: `${Math.max(6, Math.round((item.questions / maxDailyQuestions) * 100))}%` }}
                    />
                  </View>
                  <Text className='chart-label'>{item.label}</Text>
                </View>
            ))}
          </View>
          <View className='dashboard-metrics'>
            <Text className='metric-pill'>会话 {weeklyProgress.totalSessions}</Text>
            <Text className='metric-pill'>提问 {weeklyProgress.totalQuestions} 条</Text>
          </View>
        </View>
      </View>
      <View className='shortcut-grid'>
        {shortcuts.map((item, index) => (
          <View key={item.key} className='shortcut-item' onClick={item.onClick}>
            <Text className='shortcut-index'>0{index + 1}</Text>
            <View className={`shortcut-mark shortcut-mark-${item.key}`}>
              <View className={`shortcut-icon shortcut-icon-${item.key}`}>
                <View className='shortcut-icon-detail' />
              </View>
            </View>
            <Text className='shortcut-title'>{item.title}</Text>
            <Text className='shortcut-desc'>{item.desc}</Text>
            <View className='shortcut-foot'>
              <Text className='shortcut-foot-line' />
            </View>
          </View>
        ))}
      </View>

      <View className='task-card'>
        <View className='section-head'>
          <View>
            <Text className='section-title'>今日待办事项</Text>
            <Text className='section-meta'>这里展示今天较重要的待办事项</Text>
          </View>
        </View>
        <View className='section-divider' />
        {todayTodos.length > 0 ? todayTodos.slice(0, 5).map((item) => (
          <View key={item.id} className='task-item' onClick={() => Taro.switchTab({ url: '/pages/todo/index' })}>
            <Text className={`task-check ${item.done ? 'done' : ''}`}>{item.done ? '✓' : ''}</Text>
            <View className='task-main'>
              <Text className={`task-text ${item.done ? 'done' : ''}`}>{item.title}</Text>
              <Text className='task-meta'>{item.done ? '已完成' : '待处理'}</Text>
            </View>
          </View>
        )) : null}
        {todayTodos.length > 0 ? (
          <View className='section-foot'>
            <Button className='mini-go secondary' size='mini' onClick={() => Taro.switchTab({ url: '/pages/todo/index' })}>
              查看全部
            </Button>
          </View>
        ) : (
          <>
            <Text className='quick-empty'>今天暂无待办事项，可前往待办页添加</Text>
            <View className='section-foot'>
              <Button className='mini-go secondary' size='mini' onClick={() => Taro.switchTab({ url: '/pages/todo/index' })}>
                去添加
              </Button>
            </View>
          </>
        )}
      </View>

      <View className='quick-card'>
        <View className='section-head stack'>
          <View>
            <Text className='section-title'>热门问题一键问</Text>
            <Text className='section-meta'>结合近期常见问题，便于快速发起提问</Text>
          </View>
        </View>
        <View className='section-divider' />
        {quickList.length > 0 ? quickList.map((item, index) => (
          <View key={`${index}-${item.question}`} className='quick-item' onClick={() => onQuickAsk(item.question)}>
            <Text className='quick-order'>{index + 1}</Text>
            <View className='quick-main'>
              <Text className='quick-text'>{item.question}</Text>
              <Text className='quick-meta'>点击后可直接带入提问框</Text>
            </View>
          </View>
        )) : (
          <Text className='quick-empty'>登录后，这里会显示你所在地区的常见问题。</Text>
        )}
      </View>

      <View className='cta'>
        <Button className='cta-btn' onClick={() => Taro.switchTab({ url: '/pages/chat/index' })}>
          立即提问
        </Button>
      </View>
    </View>
  )
}

export default HomePage

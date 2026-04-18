import { Button, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useEffect, useMemo, useState } from 'react'
import MessageBubble from '../../components/MessageBubble'
import {
  createSession,
  deleteSession,
  getQuickQuestions,
  listMessages,
  listSessions,
  streamCompletion,
} from '@/services/chat'
import { getAppSettings } from '@/services/settings'
import { ChatMessage, ChatSession } from '@/types/chat'
import { ensureAuthed } from '@/utils/auth'
import './index.scss'

const PREFILL_KEY = 'agri:chat:prefill-question'

const ChatPage = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageScrollTop, setMessageScrollTop] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const quickQuestions = useMemo(() => getQuickQuestions(), [])

  useEffect(() => {
    if (messages.length === 0) {
      setMessageScrollTop(0)
      return
    }
    setMessageScrollTop((prev) => prev + 9999)
  }, [messages])

  const buildSessionTitle = (query: string): string => {
    const title = query.trim().slice(0, 10)
    return title || '新会话'
  }

  const refreshSessions = async () => {
    const data = await listSessions()
    setSessions(data)
    return data
  }

  const refreshMessages = async (sessionId: string) => {
    const data = await listMessages(sessionId)
    setMessages(data)
    return data
  }

  const ensureSession = async () => {
    const settings = getAppSettings()
    if (!settings.baseUrl.trim() || !settings.token.trim() || !settings.userId.trim()) {
      setNeedsSetup(true)
      setSessions([])
      setMessages([])
      setActiveSessionId('')
      return ''
    }

    setNeedsSetup(false)
    const all = await refreshSessions()
    if (all.length === 0) {
      setActiveSessionId('')
      setMessages([])
      return ''
    }

    const target = all.find((item) => item.id === activeSessionId) || all[0]
    setActiveSessionId(target.id)
    await refreshMessages(target.id)
    return target.id
  }

  const submitQuestion = async (question: string, sessionIdOverride?: string) => {
    const query = question.trim()
    if (!query || loading) return
    if (!sidebarCollapsed) setSidebarCollapsed(true)
    const settings = getAppSettings()

    setLoading(true)
    setInputValue('')

    let sessionId = sessionIdOverride || activeSessionId
    let assistantMessageId = ''

    try {
      if (!sessionId) {
        const created = await createSession(buildSessionTitle(query))
        sessionId = created.id
        setActiveSessionId(created.id)
        setSessions((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
        setMessages([])
      }

      const now = Date.now()
      const tempUserMessage: ChatMessage = {
        id: `temp-user-${now}`,
        sessionId,
        sender: 1,
        content: query,
        createTime: new Date().toISOString(),
        status: 1,
      }
      assistantMessageId = `temp-assistant-${now}`
      const tempAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId,
        sender: 0,
        content: '...',
        createTime: new Date().toISOString(),
        status: 1,
      }
      setMessages((prev) => [...prev, tempUserMessage, tempAssistantMessage])

      const history = messages.filter((item) => item.status === 1).map((item) => {
        const { sender, content, extra } = item
        return {
          sender,
          content,
          extra,
        }
      }).slice(-10)
      await streamCompletion(
        {
          query,
          sessionId,
          model: settings.model,
          collectionId: settings.collectionId,
          history,
        },
        (_delta, full) => {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantMessageId
                ? {
                    ...item,
                    content: full,
                  }
                : item,
            ),
          )
        },
      )

      await refreshMessages(sessionId)
      await refreshSessions()
    } catch (err) {
      await Taro.showToast({ title: (err as Error).message || '发送失败', icon: 'none' })
      if (sessionId) {
        await refreshMessages(sessionId)
      }
    } finally {
      setLoading(false)
    }
  }

  const onNewSession = async () => {
    if (needsSetup) {
      await Taro.showToast({ title: '请先到“我的”页配置连接', icon: 'none' })
      return
    }
    setSidebarCollapsed(true)
    setActiveSessionId('')
    setMessages([])
    if (sidebarCollapsed) setSidebarCollapsed(false)
  }

  const onDeleteSession = async (sessionId: string) => {
    try {
      const confirm = await Taro.showModal({
        title: '删除会话',
        content: '确定要删除这个会话吗？此操作不可恢复。',
        confirmText: '删除',
        cancelText: '取消',
      })
      if (!confirm.confirm) return
      await deleteSession(sessionId)
      if (sessionId === activeSessionId) {
        setActiveSessionId('')
        setMessages([])
      }
      await ensureSession()
    } catch (err) {
      await Taro.showToast({ title: (err as Error).message || '删除失败', icon: 'none' })
    }
  }

  const onSwitchSession = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    await refreshMessages(sessionId)
    if (!sidebarCollapsed) setSidebarCollapsed(true)
  }

  useDidShow(async () => {
    if (!await ensureAuthed()) return
    ;(async () => {
      await ensureSession()
      const prefill = Taro.getStorageSync(PREFILL_KEY)
      if (prefill) {
        Taro.removeStorageSync(PREFILL_KEY)
        await submitQuestion(String(prefill))
      }
    })().catch((err) => {
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' })
    })
  })

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  return (
    <View className='qa-page safe-shell'>
      <View className='toolbar'>
        <Button className='ghost-btn' onClick={() => setSidebarCollapsed((v) => !v)}>
          {sidebarCollapsed ? '展开会话' : '收起会话'}
        </Button>
        <View className='toolbar-title'>
          <Text className='title-main'>湖北省农业智能问答助手</Text>
          <Text className='title-sub'>{activeSession?.title || '新对话'}</Text>
        </View>
      </View>

      <View className='layout'>
        <View className={`session-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <View className='session-header'>
            <Text className='session-header-text'>会话列表</Text>
            <Button className='mini-primary' size='mini' onClick={onNewSession}>
              新建
            </Button>
          </View>
          <ScrollView scrollY showScrollbar={false} className='session-scroll'>
            {sessions.map((item) => (
              <View
                key={item.id}
                className={`session-item ${item.id === activeSessionId ? 'active' : ''}`}
                onClick={() => onSwitchSession(item.id)}
              >
                <View className='session-item-main'>
                  <Text className='session-item-title'>{item.title}</Text>
                  <Text className='session-item-time'>{item.updateTime?.replace('T', ' ').slice(0, 16)}</Text>
                </View>
                <Text
                  className='session-item-delete'
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(item.id)
                  }}
                >
                  删除
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className='chat-panel'>
          <ScrollView
            scrollY
            showScrollbar={false}
            className='message-scroll'
            scrollWithAnimation
            scrollTop={messageScrollTop}
          >
            {needsSetup ? (
              <View className='welcome-card'>
                <Text className='welcome-title'>先完成连接配置，再开始问答</Text>
                <Text className='welcome-tip'>请到“我的”页填写后端地址、用户ID并登录获取 Token。</Text>
                <Button className='setup-btn' onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}>
                  去配置
                </Button>
              </View>
            ) : messages.length === 0 ? (
              <View className='welcome-card'>
                <Text className='welcome-title'>请输入农业问题，系统将实时流式生成答案</Text>
                <View className='quick-list'>
                  {quickQuestions.map((q) => (
                    <View key={q} className='quick-item' onClick={() => submitQuestion(q)}>
                      <Text>{q}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                {messages.map((item) => <MessageBubble key={item.id} message={item} />)}
                {loading ? (
                  <View className='ai-loading-shell'>
                    <Text className='ai-loading-text'>AI 正在组织答案...</Text>
                    <View className='ai-loading-lines'>
                      <View className='ai-loading-line line-1' />
                      <View className='ai-loading-line line-2' />
                      <View className='ai-loading-line line-3' />
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          <View className='composer safe-bottom'>
            <Input
              className='composer-input'
              value={inputValue}
              onInput={(e) => setInputValue(e.detail.value)}
              placeholder='描述作物、症状、地区、天气等关键信息'
              confirmType='send'
              onConfirm={() => submitQuestion(inputValue)}
              disabled={loading}
            />
            <Button
              className='composer-send'
              loading={loading}
              disabled={loading || !inputValue.trim()}
              onClick={() => submitQuestion(inputValue)}
            >
              发送
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ChatPage

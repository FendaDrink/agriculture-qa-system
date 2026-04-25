import { Button, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow, usePullDownRefresh } from '@tarojs/taro'
import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from '../../components/MessageBubble'
import {
  createSession,
  deleteSession,
  generateSessionTitle,
  getFollowupSuggestions,
  listQuickQuestions,
  listMessages,
  listSessions,
  speechRecognizeByFile,
  streamCompletion,
  updateSessionTitle,
  QuickQuestionItem,
} from '@/services/chat'
import { getAppSettings } from '@/services/settings'
import { ChatMessage, ChatSession } from '@/types/chat'
import { ensureAuthed } from '@/utils/auth'
import './index.scss'

const PREFILL_KEY = 'agri:chat:prefill-question'
const ACTIVE_SESSION_KEY = 'agri:chat:active-session-id'

const ChatPage = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageScrollTop, setMessageScrollTop] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceWillCancel, setVoiceWillCancel] = useState(false)
  const [speechDraft, setSpeechDraft] = useState('')
  const [speechRecognizing, setSpeechRecognizing] = useState(false)
  const [speechError, setSpeechError] = useState('')

  const recorderRef = useRef<Taro.RecorderManager | null>(null)
  const recordingTimerRef = useRef<number | null>(null)
  const recorderStartedRef = useRef(false)
  const recorderStartingRef = useRef(false)
  const shouldContinueRecordingRef = useRef(false)
  const stopRequestedBeforeStartRef = useRef(false)
  const pendingFinalizeRef = useRef(false)
  const speechDraftRef = useRef('')
  const chunkQueueRef = useRef<string[]>([])
  const processingQueueRef = useRef(false)
  const discardSpeechRef = useRef(false)
  const voiceTouchStartYRef = useRef(0)
  const completionTaskRef = useRef<Taro.RequestTask<any> | null>(null)
  const completionAbortedRef = useRef(false)
  const activeAssistantMessageIdRef = useRef('')
  const streamRenderTimerRef = useRef<number | null>(null)
  const streamBufferRef = useRef('')
  const streamStartAtRef = useRef(0)
  const streamTickerRef = useRef<number | null>(null)

  const [quickQuestions, setQuickQuestions] = useState<QuickQuestionItem[]>([])
  const [quickLoading, setQuickLoading] = useState(false)
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([])
  const [followupLoading, setFollowupLoading] = useState(false)
  const [streamElapsedSec, setStreamElapsedSec] = useState(0)
  const [streamChars, setStreamChars] = useState(0)
  const [streamStarted, setStreamStarted] = useState(false)

  const isIgnorableRecorderError = (err: unknown) => {
    const msg = String((err as any)?.errMsg || (err as any)?.message || err || '').toLowerCase()
    return msg.includes('notfound') || msg.includes('not found') || msg.includes('operate recorder')
  }

  const clearStreamRenderTimer = () => {
    if (!streamRenderTimerRef.current) return
    clearTimeout(streamRenderTimerRef.current)
    streamRenderTimerRef.current = null
  }

  const flushStreamRender = (assistantMessageId?: string) => {
    const targetId = assistantMessageId || activeAssistantMessageIdRef.current
    if (!targetId) return
    const content = streamBufferRef.current
    if (!content) return
    setMessages((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              ...item,
              content,
            }
          : item,
      ),
    )
  }

  const stopStreamFeedback = () => {
    if (streamTickerRef.current) {
      clearInterval(streamTickerRef.current)
      streamTickerRef.current = null
    }
    clearStreamRenderTimer()
    streamBufferRef.current = ''
    streamStartAtRef.current = 0
    setStreamStarted(false)
    setStreamElapsedSec(0)
    setStreamChars(0)
  }

  const startStreamFeedback = () => {
    stopStreamFeedback()
    streamStartAtRef.current = Date.now()
    setStreamStarted(true)
    setStreamElapsedSec(0)
    setStreamChars(0)
    streamTickerRef.current = setInterval(() => {
      if (!streamStartAtRef.current) return
      setStreamElapsedSec(Math.max(0, Math.floor((Date.now() - streamStartAtRef.current) / 1000)))
    }, 500) as unknown as number
  }

  const enqueueStreamRender = (assistantMessageId: string, full: string) => {
    streamBufferRef.current = full
    setStreamChars(full.length)
    if (streamRenderTimerRef.current) return
    streamRenderTimerRef.current = setTimeout(() => {
      streamRenderTimerRef.current = null
      flushStreamRender(assistantMessageId)
    }, 48) as unknown as number
  }

  const safeStopRecorder = () => {
    if (!recorderStartedRef.current && !recorderStartingRef.current) return
    try {
      recorderRef.current?.stop()
    } catch (error) {
      if (!isIgnorableRecorderError(error)) {
        setSpeechError('停止录音失败，请重试')
      }
    }
  }

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  const startRecordingTimer = () => {
    clearRecordingTimer()
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1)
    }, 1000) as unknown as number
  }

  const resetSpeechState = () => {
    setSpeechDraft('')
    setSpeechError('')
    setSpeechRecognizing(false)
    setVoiceWillCancel(false)
    speechDraftRef.current = ''
    chunkQueueRef.current = []
    processingQueueRef.current = false
    pendingFinalizeRef.current = false
    discardSpeechRef.current = false
  }

  const appendDraftText = (text: string) => {
    const clean = text.trim()
    if (!clean) return
    speechDraftRef.current = speechDraftRef.current
      ? `${speechDraftRef.current}${clean}`
      : clean
    setSpeechDraft(speechDraftRef.current)
  }

  const mergeDraftIntoInput = () => {
    const recognized = speechDraftRef.current.trim()
    if (!recognized) return
    setInputValue((prev) => {
      const base = prev.trim()
      return base ? `${base} ${recognized}` : recognized
    })
    speechDraftRef.current = ''
    setSpeechDraft('')
  }

  const processChunkQueue = async () => {
    if (processingQueueRef.current) return
    processingQueueRef.current = true
    setSpeechRecognizing(true)
    try {
      while (chunkQueueRef.current.length > 0) {
        const chunkPath = chunkQueueRef.current.shift()
        if (!chunkPath) continue
        if (discardSpeechRef.current) continue
        const text = await speechRecognizeByFile(chunkPath)
        if (discardSpeechRef.current) continue
        appendDraftText(text)
      }
    } catch (err) {
      setSpeechError((err as Error).message || '语音识别失败')
    } finally {
      processingQueueRef.current = false
      if (chunkQueueRef.current.length > 0) {
        processChunkQueue()
        return
      }
      if (!shouldContinueRecordingRef.current) {
        setSpeechRecognizing(false)
      }
      if (pendingFinalizeRef.current && !shouldContinueRecordingRef.current && !discardSpeechRef.current) {
        mergeDraftIntoInput()
        pendingFinalizeRef.current = false
      }
      if (discardSpeechRef.current) {
        setSpeechDraft('')
        speechDraftRef.current = ''
      }
    }
  }

  const enqueueAudioChunk = (path: string) => {
    if (!path) return
    if (discardSpeechRef.current) return
    chunkQueueRef.current.push(path)
    processChunkQueue()
  }

  const startAudioChunk = () => {
    const recorder = recorderRef.current
    if (!recorder) return
    if (recorderStartingRef.current || recorderStartedRef.current) return
    recorderStartingRef.current = true
    try {
      recorder.start({
        duration: 4000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'aac',
      } as any)
    } catch (err) {
      setSpeechError('启动录音失败')
      recorderStartingRef.current = false
      shouldContinueRecordingRef.current = false
      recorderStartedRef.current = false
      setRecording(false)
      clearRecordingTimer()
    }
  }

  const stopVoiceInput = (mergeToInput = true) => {
    if (!recording && !recorderStartingRef.current) return
    shouldContinueRecordingRef.current = false
    pendingFinalizeRef.current = mergeToInput
    if (recorderStartedRef.current) {
      safeStopRecorder()
    } else {
      stopRequestedBeforeStartRef.current = true
    }
    clearRecordingTimer()
    setRecording(false)
    setVoiceWillCancel(false)
  }

  const cancelVoiceInput = () => {
    discardSpeechRef.current = true
    chunkQueueRef.current = []
    pendingFinalizeRef.current = false
    speechDraftRef.current = ''
    setSpeechDraft('')
    stopVoiceInput(false)
  }

  const startVoiceInput = async () => {
    if (process.env.TARO_ENV === 'h5') {
      await Taro.showToast({ title: 'H5 预览不支持按住录音，请在小程序环境体验', icon: 'none' })
      return
    }
    if (needsSetup) {
      await Taro.showToast({ title: '请先到“我的”页完成配置', icon: 'none' })
      return
    }
    if (loading) {
      await Taro.showToast({ title: '请等待当前回复完成', icon: 'none' })
      return
    }
    if (speechRecognizing) {
      await Taro.showToast({ title: '正在识别上段语音，请稍候', icon: 'none' })
      return
    }
    try {
      const setting = await Taro.getSetting()
      const granted = setting?.authSetting?.['scope.record']
      if (!granted) {
        await Taro.authorize({ scope: 'scope.record' })
      }
    } catch (error) {
      await Taro.showToast({ title: '请先授权麦克风权限', icon: 'none' })
      return
    }
    resetSpeechState()
    setRecordingSeconds(0)
    shouldContinueRecordingRef.current = true
    stopRequestedBeforeStartRef.current = false
    pendingFinalizeRef.current = false
    discardSpeechRef.current = false
    recorderStartedRef.current = false
    recorderStartingRef.current = false
    setRecording(true)
    startRecordingTimer()
    startAudioChunk()
  }

  const onVoiceTouchStart = (e: any) => {
    if (recording) return
    voiceTouchStartYRef.current = e?.changedTouches?.[0]?.clientY ?? e?.touches?.[0]?.clientY ?? 0
    setVoiceWillCancel(false)
    startVoiceInput()
  }

  const onVoiceTouchMove = (e: any) => {
    if (!recording) return
    const currentY = e?.changedTouches?.[0]?.clientY ?? e?.touches?.[0]?.clientY ?? voiceTouchStartYRef.current
    const offset = voiceTouchStartYRef.current - currentY
    setVoiceWillCancel(offset > 70)
  }

  const onVoiceTouchEnd = () => {
    if (!recording) return
    if (voiceWillCancel) {
      cancelVoiceInput()
      return
    }
    stopVoiceInput(true)
  }

  useEffect(() => {
    if (messages.length === 0) {
      setMessageScrollTop(0)
      return
    }
    setMessageScrollTop((prev) => prev + 9999)
  }, [messages])

  useEffect(() => {
    if (process.env.TARO_ENV === 'h5') return
    const recorder = Taro.getRecorderManager?.()
    if (!recorder) return
    recorderRef.current = recorder
    recorder.onStart(() => {
      recorderStartingRef.current = false
      recorderStartedRef.current = true
      if (!shouldContinueRecordingRef.current || stopRequestedBeforeStartRef.current) {
        stopRequestedBeforeStartRef.current = false
        safeStopRecorder()
      }
    })
    recorder.onStop((result: any) => {
      recorderStartedRef.current = false
      recorderStartingRef.current = false
      if (result?.tempFilePath) {
        enqueueAudioChunk(result.tempFilePath)
      }
      if (shouldContinueRecordingRef.current) {
        startAudioChunk()
      } else {
        setRecording(false)
      }
    })
    recorder.onError((error: any) => {
      if (isIgnorableRecorderError(error)) {
        recorderStartedRef.current = false
        recorderStartingRef.current = false
        stopRequestedBeforeStartRef.current = false
        return
      }
      setSpeechError(error?.errMsg || '录音异常，请重试')
      shouldContinueRecordingRef.current = false
      recorderStartedRef.current = false
      recorderStartingRef.current = false
      stopRequestedBeforeStartRef.current = false
      setRecording(false)
      clearRecordingTimer()
    })

    return () => {
      shouldContinueRecordingRef.current = false
      recorderStartedRef.current = false
      recorderStartingRef.current = false
      stopRequestedBeforeStartRef.current = false
      clearRecordingTimer()
      safeStopRecorder()
    }
  }, [])

  const buildFallbackSessionTitle = (query: string): string => {
    const title = query.trim().slice(0, 18)
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

  const refreshQuickQuestions = async (silent = true) => {
    if (!silent) setQuickLoading(true)
    try {
      const quickList = await listQuickQuestions(4)
      setQuickQuestions(quickList)
    } catch {
      setQuickQuestions([])
    } finally {
      if (!silent) setQuickLoading(false)
    }
  }

  const finalizeCanceledAssistantMessage = () => {
    const targetId = activeAssistantMessageIdRef.current
    if (!targetId) return
    setMessages((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item
        const content = (item.content || '').trim()
        if (!content || content === '...') {
          return { ...item, content: '已取消回答' }
        }
        if (content.includes('已取消')) return item
        return { ...item, content: `${content}\n\n（已取消）` }
      }),
    )
  }

  const refreshFollowupQuestions = async (sessionId: string, baseQuery?: string) => {
    if (!sessionId) {
      setFollowupQuestions([])
      return
    }
    setFollowupLoading(true)
    try {
      const history = messages
        .filter((item) => item.status === 1)
        .map((item) => ({
          sender: item.sender,
          content: item.content,
          extra: item.extra as Record<string, unknown> | undefined,
        }))
        .slice(-12)
      const rows = await getFollowupSuggestions({
        sessionId,
        query: baseQuery,
        history,
        limit: 3,
      })
      setFollowupQuestions(rows)
    } catch {
      setFollowupQuestions([])
    } finally {
      setFollowupLoading(false)
    }
  }

  const cancelCompletion = () => {
    if (!loading) return
    completionAbortedRef.current = true
    try {
      completionTaskRef.current?.abort?.()
    } catch (error) {
      // ignore abort errors
    }
    finalizeCanceledAssistantMessage()
    stopStreamFeedback()
    setLoading(false)
  }

  const ensureSession = async () => {
    const settings = getAppSettings()
    if (!settings.baseUrl.trim() || !settings.token.trim() || !settings.userId.trim()) {
      setNeedsSetup(true)
      setSessions([])
      setMessages([])
      setActiveSessionId('')
      Taro.setStorageSync(ACTIVE_SESSION_KEY, '')
      return ''
    }

    setNeedsSetup(false)
    const all = await refreshSessions()
    if (all.length === 0) {
      setActiveSessionId('')
      setMessages([])
      Taro.setStorageSync(ACTIVE_SESSION_KEY, '')
      return ''
    }

    const storedId = String(Taro.getStorageSync(ACTIVE_SESSION_KEY) || '')
    const targetId = storedId || activeSessionId
    const target = all.find((item) => item.id === targetId) || all[0]
    setActiveSessionId(target.id)
    Taro.setStorageSync(ACTIVE_SESSION_KEY, target.id)
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
    let createdNewSession = false
    completionAbortedRef.current = false
    completionTaskRef.current = null

    try {
      if (!sessionId) {
        const suggestedTitle = await generateSessionTitle({
          query,
          model: settings.model,
        }).catch(() => '')
        const created = await createSession(suggestedTitle || buildFallbackSessionTitle(query))
        sessionId = created.id
        createdNewSession = true
        setActiveSessionId(created.id)
        Taro.setStorageSync(ACTIVE_SESSION_KEY, created.id)
        setSessions((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
        setMessages([])
        setFollowupQuestions([])
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
      activeAssistantMessageIdRef.current = assistantMessageId
      const tempAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId,
        sender: 0,
        content: '思考中…',
        createTime: new Date().toISOString(),
        status: 1,
      }
      setMessages((prev) => [...prev, tempUserMessage, tempAssistantMessage])
      startStreamFeedback()

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
          history,
        },
        (_delta, full) => {
          enqueueStreamRender(assistantMessageId, full)
        },
        {
          onTaskCreated: (task) => {
            completionTaskRef.current = task
          },
        },
      )
      clearStreamRenderTimer()
      flushStreamRender(assistantMessageId)
      stopStreamFeedback()

      const latestMessages = await refreshMessages(sessionId)
      if (createdNewSession) {
        const latestAnswer = [...latestMessages].reverse().find((item) => item.sender === 0)?.content || ''
        const refinedTitle = await generateSessionTitle({
          query,
          answer: latestAnswer,
          model: settings.model,
        }).catch(() => '')
        if (refinedTitle) {
          await updateSessionTitle(sessionId, refinedTitle).catch(() => null)
        }
      }
      await refreshSessions()
      refreshQuickQuestions().catch(() => {})
      refreshFollowupQuestions(sessionId, query).catch(() => {})
    } catch (err) {
      const errMsg = String((err as any)?.errMsg || (err as Error)?.message || '')
      const aborted = completionAbortedRef.current || errMsg.toLowerCase().includes('abort')
      if (aborted) {
        finalizeCanceledAssistantMessage()
      } else {
        await Taro.showToast({ title: (err as Error).message || '发送失败', icon: 'none' })
      }
      if (sessionId && !aborted) {
        await refreshMessages(sessionId)
      }
    } finally {
      stopStreamFeedback()
      completionTaskRef.current = null
      completionAbortedRef.current = false
      activeAssistantMessageIdRef.current = ''
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
    Taro.setStorageSync(ACTIVE_SESSION_KEY, '')
    setMessages([])
    setFollowupQuestions([])
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
        Taro.setStorageSync(ACTIVE_SESSION_KEY, '')
        setMessages([])
        setFollowupQuestions([])
      }
      await ensureSession()
    } catch (err) {
      await Taro.showToast({ title: (err as Error).message || '删除失败', icon: 'none' })
    }
  }

  const onSwitchSession = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    Taro.setStorageSync(ACTIVE_SESSION_KEY, sessionId)
    await refreshMessages(sessionId)
    refreshFollowupQuestions(sessionId).catch(() => {})
    if (!sidebarCollapsed) setSidebarCollapsed(true)
  }

  useDidShow(async () => {
    if (!await ensureAuthed()) return
    ;(async () => {
      await refreshQuickQuestions()
      const sid = await ensureSession()
      if (sid) {
        await refreshFollowupQuestions(sid)
      }
      const prefill = Taro.getStorageSync(PREFILL_KEY)
      if (prefill) {
        Taro.removeStorageSync(PREFILL_KEY)
        await submitQuestion(String(prefill))
      }
    })().catch((err) => {
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' })
    })
  })

  useDidHide(() => {
    if (shouldContinueRecordingRef.current) {
      stopVoiceInput(false)
    }
    if (loading) {
      cancelCompletion()
    }
  })

  useEffect(() => {
    return () => {
      stopStreamFeedback()
    }
  }, [])

  usePullDownRefresh(() => {
    ;(async () => {
      try {
        await refreshQuickQuestions(false)
        const sid = await ensureSession()
        if (sid) {
          await refreshFollowupQuestions(sid)
        }
      } finally {
        Taro.stopPullDownRefresh()
      }
    })()
  })

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const lastAssistantId = [...messages].reverse().find((item) => item.sender === 0)?.id || ''
  const loadingText = streamStarted
    ? (streamChars > 0
      ? `正在整理回答，已输出 ${streamChars} 字 · ${streamElapsedSec}s`
      : `问题已提交，正在查询相关资料... ${streamElapsedSec}s`)
    : '正在整理回答...'

  return (
    <View className='qa-page safe-shell'>
      <View className='toolbar'>
        <View className='toolbar-title'>
          <View className='toolbar-title-head'>
            <View className='session-toggle' onClick={() => setSidebarCollapsed((v) => !v)}>
              <View className={`session-toggle-icon ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}>
                <Text className='session-toggle-line line-a' />
                <Text className='session-toggle-line line-b' />
                <Text className='session-toggle-line line-c' />
              </View>
            </View>
            <View className='toolbar-copy'>
              <Text className='title-main'>湖北农业问答助手</Text>
              <Text className='title-sub'>{activeSession?.title || '新对话'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className='layout'>
        <View className={`session-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <View className='session-header'>
            <View>
              <Text className='session-header-kicker'>历史会话</Text>
              <Text className='session-header-text'>提问记录</Text>
            </View>
            <Button className='mini-primary' size='mini' onClick={onNewSession}>
              新建
            </Button>
          </View>
          <ScrollView scrollY showScrollbar={false} className='session-scroll'>
            {sessions.length > 0 ? sessions.map((item) => (
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
            )) : (
              <View className='session-empty'>
                <Text className='session-empty-mark'>记</Text>
                <Text className='session-empty-title'>暂无提问记录</Text>
                <Text className='session-empty-desc'>提交过的问题会保存在这里，方便后续继续查看和补充提问。</Text>
              </View>
            )}
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
                <Text className='welcome-badge'>请先登录</Text>
                <Text className='welcome-title'>登录后再使用问答服务</Text>
                <Text className='welcome-tip'>登录后可保存提问记录，并继续查看和补充此前的咨询内容。</Text>
                <Button className='setup-btn' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>
                  去登录
                </Button>
              </View>
            ) : messages.length === 0 ? (
              <View className='welcome-card'>
                <Text className='welcome-badge'>提问提示</Text>
                <Text className='welcome-title'>请尽量完整描述种植情况</Text>
                <Text className='welcome-tip'>建议写明作物、症状、地区、时间和天气，便于给出更准确的参考意见。</Text>
                <View className='welcome-note'>
                  <Text className='welcome-note-label'>示例</Text>
                  <Text className='welcome-note-text'>例如：武汉番茄叶片发黄并带有白粉，最近连续阴雨，这种情况应如何处理？</Text>
                </View>
                <View className='quick-list'>
                  <View className='quick-tools'>
                    <Text className='quick-tools-title'>常见问题</Text>
                    <Text className='quick-tools-refresh' onClick={() => refreshQuickQuestions(false)}>
                      {quickLoading ? '刷新中...' : '换一批'}
                    </Text>
                  </View>
                  {quickQuestions.length > 0 ? (
                    quickQuestions.map((q) => (
                      <View key={q.question} className='quick-item' onClick={() => submitQuestion(q.question)}>
                        <Text>{q.question}</Text>
                        {q.frequency ? <Text className='quick-item-meta'>{q.frequency}次</Text> : null}
                      </View>
                    ))
                  ) : (
                    <View className='quick-item'>
                      <Text>暂无推荐问题，可直接输入你的问题</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <>
                {messages.map((item) => (
                  <View key={item.id}>
                    <MessageBubble message={item} isStreaming={loading && item.id === lastAssistantId} />
                    {item.id === lastAssistantId && !loading ? (
                      <View className='followup-card'>
                        <Text className='followup-title'>相关问题参考</Text>
                        {followupLoading ? (
                          <Text className='followup-loading'>正在整理相关问题...</Text>
                        ) : followupQuestions.length > 0 ? (
                          <View className='followup-list'>
                            {followupQuestions.map((q) => (
                              <View key={q} className='followup-item' onClick={() => submitQuestion(q)}>
                                <Text>{q}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text className='followup-loading'>暂无相关问题，可继续补充提问</Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                ))}
                {loading ? (
                  <View className='ai-loading-shell'>
                    <Text className='ai-loading-text'>{loadingText}</Text>
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

          <View className='composer-shell safe-bottom'>
            <View className='composer'>
              <Button
                className='composer-mode'
                disabled={loading || speechRecognizing}
                onClick={() => {
                  if (recording) return
                  setInputMode((prev) => (prev === 'text' ? 'voice' : 'text'))
                }}
              >
                {inputMode === 'text' ? '语音' : '键盘'}
              </Button>
              {inputMode === 'text' ? (
                <Input
                  className='composer-input'
                  value={inputValue}
                  onInput={(e) => setInputValue(e.detail.value)}
                  placeholder='请输入你想咨询的问题'
                  confirmType='send'
                  onConfirm={() => submitQuestion(inputValue)}
                  disabled={loading}
                />
              ) : (
                <Button
                  className={`composer-hold ${recording ? 'recording' : ''} ${voiceWillCancel ? 'cancel' : ''}`}
                  disabled={loading || needsSetup || speechRecognizing}
                  onTouchStart={onVoiceTouchStart}
                  onTouchMove={onVoiceTouchMove}
                  onTouchEnd={onVoiceTouchEnd}
                  onTouchCancel={cancelVoiceInput}
                >
                {recording ? (voiceWillCancel ? '松开取消' : '松开转文字') : '按住说话'}
              </Button>
              )}
              {loading ? (
                <Button className='composer-cancel-send' onClick={cancelCompletion}>
                  {streamElapsedSec > 0 ? `取消 ${streamElapsedSec}s` : '取消发送'}
                </Button>
              ) : inputMode === 'text' ? (
                <Button
                  className='composer-send'
                  loading={speechRecognizing}
                  disabled={speechRecognizing || recording || !inputValue.trim()}
                  onClick={() => submitQuestion(inputValue)}
                >
                  发送
                </Button>
              ) : null}
            </View>
            <View className='composer-foot'>
              <Text className='composer-foot-tip'>
                {inputMode === 'text' ? '建议尽量写明作物、地区和症状信息' : '不方便打字时，可按住直接说话'}
              </Text>
            </View>
          </View>
          {recording || speechRecognizing || speechDraft || speechError ? (
            <View className='voice-bar'>
              {recording ? (
                <Text className='voice-bar-main'>
                  {voiceWillCancel ? `松开后取消 (${recordingSeconds}s)` : `录音中 ${recordingSeconds}s，上滑可取消，松开后转成文字`}
                </Text>
              ) : speechRecognizing ? (
                <Text className='voice-bar-main'>正在转换语音内容...</Text>
              ) : null}
              {speechDraft ? (
                <Text className='voice-bar-sub'>转换内容：{speechDraft}</Text>
              ) : null}
              {speechError ? (
                <Text className='voice-bar-error'>{speechError}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export default ChatPage

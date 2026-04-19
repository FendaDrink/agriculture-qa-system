import { Button, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow, usePullDownRefresh } from '@tarojs/taro'
import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from '../../components/MessageBubble'
import {
  createSession,
  deleteSession,
  getFollowupSuggestions,
  listQuickQuestions,
  listMessages,
  listSessions,
  speechRecognizeByFile,
  streamCompletion,
  QuickQuestionItem,
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

  const [quickQuestions, setQuickQuestions] = useState<QuickQuestionItem[]>([])
  const [quickLoading, setQuickLoading] = useState(false)
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([])
  const [followupLoading, setFollowupLoading] = useState(false)

  const isIgnorableRecorderError = (err: unknown) => {
    const msg = String((err as any)?.errMsg || (err as any)?.message || err || '').toLowerCase()
    return msg.includes('notfound') || msg.includes('not found') || msg.includes('operate recorder')
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
    setLoading(false)
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
    completionAbortedRef.current = false
    completionTaskRef.current = null

    try {
      if (!sessionId) {
        const created = await createSession(buildSessionTitle(query))
        sessionId = created.id
        setActiveSessionId(created.id)
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
        {
          onTaskCreated: (task) => {
            completionTaskRef.current = task
          },
        },
      )

      await refreshMessages(sessionId)
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
                  <View className='quick-tools'>
                    <Text className='quick-tools-title'>高频问题引导</Text>
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
                      <Text>暂无高频问题，试试输入你的问题</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <>
                {messages.map((item) => (
                  <View key={item.id}>
                    <MessageBubble message={item} />
                    {item.id === lastAssistantId && !loading ? (
                      <View className='followup-card'>
                        <Text className='followup-title'>猜你继续想问</Text>
                        {followupLoading ? (
                          <Text className='followup-loading'>正在生成推荐...</Text>
                        ) : followupQuestions.length > 0 ? (
                          <View className='followup-list'>
                            {followupQuestions.map((q) => (
                              <View key={q} className='followup-item' onClick={() => submitQuestion(q)}>
                                <Text>{q}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text className='followup-loading'>暂无推荐，可继续输入问题</Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                ))}
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
                placeholder='描述作物、症状、地区、天气等关键信息'
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
                取消发送
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
          {recording || speechRecognizing || speechDraft || speechError ? (
            <View className='voice-bar'>
              {recording ? (
                <Text className='voice-bar-main'>
                  {voiceWillCancel ? `松开将取消 (${recordingSeconds}s)` : `按住录音中 ${recordingSeconds}s，上滑取消，松开转文字`}
                </Text>
              ) : speechRecognizing ? (
                <Text className='voice-bar-main'>正在识别语音...</Text>
              ) : null}
              {speechDraft ? (
                <Text className='voice-bar-sub'>转写草稿：{speechDraft}</Text>
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

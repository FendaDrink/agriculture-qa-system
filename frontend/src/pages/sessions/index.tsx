import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React from 'react'
import { useState } from 'react'
import { createSession, deleteSession, listSessions } from '../../services/chat'
import { ChatSession } from '../../types/chat'
import './index.scss'

const ACTIVE_SESSION_KEY = 'agri:chat:active-session-id'

const SessionsPage = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [newTitle, setNewTitle] = useState('')

  const refresh = async () => {
    const data = await listSessions()
    setSessions(data)
  }

  useDidShow(() => {
    refresh()
  })

  const onCreate = async () => {
    const title = newTitle.trim() || '新会话'
    const session = await createSession(title)
    setNewTitle('')
    Taro.setStorageSync(ACTIVE_SESSION_KEY, session.id)
    Taro.showToast({ title: '已创建并切换', icon: 'none' })
    await refresh()
  }

  const onDelete = async (sessionId: string) => {
    await deleteSession(sessionId)
    const current = Taro.getStorageSync(ACTIVE_SESSION_KEY)
    if (current === sessionId) {
      const all = await listSessions()
      Taro.setStorageSync(ACTIVE_SESSION_KEY, all[0]?.id || '')
    }
    await refresh()
  }

  const onActivate = (sessionId: string) => {
    Taro.setStorageSync(ACTIVE_SESSION_KEY, sessionId)
    Taro.showToast({ title: '已切换会话', icon: 'none' })
  }

  const currentId = Taro.getStorageSync(ACTIVE_SESSION_KEY)

  return (
    <View className='session-page container'>
      <View className='session-create card'>
        <Input
          value={newTitle}
          onInput={(e) => setNewTitle(e.detail.value)}
          placeholder='输入会话标题（可选）'
          className='session-input'
        />
        <Button className='session-create-btn' onClick={onCreate}>
          新建会话
        </Button>
      </View>

      <View className='session-list'>
        {sessions.length === 0 ? (
          <View className='session-empty card'>
            <Text>暂无会话，请先创建一个会话开始问答。</Text>
          </View>
        ) : (
          sessions.map((item) => (
            <View key={item.id} className={`session-item card ${item.id === currentId ? 'active' : ''}`}>
              <View className='session-main' onClick={() => onActivate(item.id)}>
                <Text className='session-title'>{item.title}</Text>
                <Text className='session-time'>更新时间：{item.updateTime.replace('T', ' ').slice(0, 16)}</Text>
              </View>
              <Button className='session-del-btn' size='mini' onClick={() => onDelete(item.id)}>
                删除
              </Button>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

export default SessionsPage

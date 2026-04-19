import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React from 'react'
import { ChatMessage, MessageSourceItem } from '@/types/chat'
import { getAppSettings } from '@/services/settings'
import './MessageBubble.scss'

interface Props {
  message: ChatMessage
}

const MessageBubble = ({ message }: Props) => {
  const isUser = message.sender === 1
  const rawSources = (message.extra as any)?.sources
  const sourceList: MessageSourceItem[] = Array.isArray(rawSources) ? rawSources : []
  const sources = sourceList.reduce<MessageSourceItem[]>((acc, item) => {
    const key = item.documentId || item.fileHash || item.fileName
    if (!key) return acc
    if (!acc.some((row) => (row.documentId || row.fileHash || row.fileName) === key)) {
      acc.push(item)
    }
    return acc
  }, [])

  const openPdfSource = (source: MessageSourceItem) => {
    const settings = getAppSettings()
    const baseUrl = settings.baseUrl.trim().replace(/\/$/, '')
    const token = settings.token.trim()
    if (!baseUrl || !token || !source.documentId) {
      Taro.showToast({ title: '预览失败，缺少连接配置', icon: 'none' })
      return
    }
    const pdfUrl = `${baseUrl}/database/document/file/public?id=${encodeURIComponent(source.documentId)}&token=${encodeURIComponent(token)}`
    const pageUrl = `/pages/pdf-viewer/index?url=${encodeURIComponent(pdfUrl)}&title=${encodeURIComponent(source.fileName || '源文件')}`
    Taro.navigateTo({ url: pageUrl })
  }

  const copyMessage = async () => {
    const text = (message.content || '').trim()
    if (!text) return
    try {
      await Taro.setClipboardData({ data: text })
      await Taro.showToast({ title: '已复制', icon: 'none' })
    } catch (error) {
      await Taro.showToast({ title: '复制失败，请重试', icon: 'none' })
    }
  }

  return (
    <View className={`message-row ${isUser ? 'is-user' : 'is-assistant'}`}>
      <View className={`message-bubble ${isUser ? 'user' : 'assistant'}`} onLongPress={copyMessage}>
        <Text>{message.content}</Text>
        {!isUser && sources.length > 0 ? (
          <View className='message-sources'>
            <Text className='message-sources-title'>相关知识来源</Text>
            {sources.map((source, index) => (
              <View
                key={`${source.documentId || 'doc'}-${source.chunkId || index}`}
                className='message-source-item'
                onClick={() => openPdfSource(source)}
              >
                <Text className='message-source-name'>{source.index || index + 1}. {source.fileName || '未命名文件'}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export default MessageBubble

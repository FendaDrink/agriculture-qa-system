import { RichText, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React from 'react'
import { ChatMessage, MessageSourceItem } from '@/types/chat'
import { getAppSettings } from '@/services/settings'
import './MessageBubble.scss'

interface Props {
  message: ChatMessage
  isStreaming?: boolean
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const inlineMarkdownToHtml = (text: string) => {
  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return html
}

const markdownToHtml = (raw: string) => {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inCode = false
  let listType: 'ul' | 'ol' | '' = ''
  let orderedIndex = 0
  let hasOpenListItem = false

  const closeList = () => {
    if (!listType) return
    listType = ''
    orderedIndex = 0
    hasOpenListItem = false
  }

  const appendToLastListItem = (content: string) => {
    if (!hasOpenListItem || !html.length) return false
    const last = html[html.length - 1]
    const suffix = '</div></div>'
    if (!last.endsWith(suffix)) return false
    html[html.length - 1] = `${last.slice(0, -suffix.length)}<br/>${content}${suffix}`
    return true
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      closeList()
      if (!inCode) {
        inCode = true
        html.push('<pre><code>')
      } else {
        inCode = false
        html.push('</code></pre>')
      }
      return
    }

    if (inCode) {
      html.push(`${escapeHtml(line)}\n`)
      return
    }

    if (!trimmed) {
      // 容错：有序/无序列表中出现空行时，不立即关闭列表，
      // 避免被拆成多个 ol/ul 导致每段都从 1 开始。
      if (listType) return
      closeList()
      return
    }

    if (/^###\s+/.test(trimmed)) {
      closeList()
      html.push(`<h3>${inlineMarkdownToHtml(trimmed.replace(/^###\s+/, ''))}</h3>`)
      return
    }
    if (/^##\s+/.test(trimmed)) {
      closeList()
      html.push(`<h2>${inlineMarkdownToHtml(trimmed.replace(/^##\s+/, ''))}</h2>`)
      return
    }
    if (/^#\s+/.test(trimmed)) {
      closeList()
      html.push(`<h1>${inlineMarkdownToHtml(trimmed.replace(/^#\s+/, ''))}</h1>`)
      return
    }

    const ordered = trimmed.match(/^(\d+)\.\s+(.+)/)
    if (ordered) {
      if (listType !== 'ol') {
        closeList()
        listType = 'ol'
        orderedIndex = 0
      }
      orderedIndex += 1
      hasOpenListItem = true
      html.push(
        `<div class="md-list-item md-list-item-ordered"><span class="md-list-marker md-list-marker-ordered">${orderedIndex}.</span><div class="md-list-content">${inlineMarkdownToHtml(ordered[2])}</div></div>`,
      )
      return
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)/)
    if (unordered) {
      if (listType !== 'ul') {
        closeList()
        listType = 'ul'
      }
      hasOpenListItem = true
      html.push(
        `<div class="md-list-item md-list-item-unordered"><span class="md-list-marker md-list-marker-unordered">•</span><div class="md-list-content">${inlineMarkdownToHtml(unordered[1])}</div></div>`,
      )
      return
    }

    if (listType && appendToLastListItem(inlineMarkdownToHtml(trimmed))) {
      return
    }

    closeList()
    html.push(`<p>${inlineMarkdownToHtml(trimmed)}</p>`)
  })

  closeList()
  if (inCode) html.push('</code></pre>')
  return html.join('')
}

const MessageBubble = ({ message, isStreaming = false }: Props) => {
  const isUser = message.sender === 1
  const renderContent = isStreaming && !isUser
    ? `${message.content || ''}...`
    : (message.content || '')
  const markdownHtml = !isUser ? markdownToHtml(renderContent) : ''
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
      Taro.showToast({ title: '预览失败，请稍后再试', icon: 'none' })
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
        {!isUser ? (
          <View className='message-head'>
            {sources.length > 0 ? <Text className='message-cite-badge'>已检索到相关知识</Text> : null}
          </View>
        ) : null}
        {isUser ? (
          <Text>{renderContent}</Text>
        ) : (
          <RichText className='message-markdown' nodes={markdownHtml} />
        )}
        {!isUser && sources.length > 0 ? (
          <View className='message-sources'>
            <Text className='message-sources-title'>相关资料</Text>
            {sources.map((source, index) => (
              <View
                key={`${source.documentId || 'doc'}-${source.chunkId || index}`}
                className='message-source-item'
                onClick={() => openPdfSource(source)}
              >
                <View className='message-source-top'>
                  <Text className='message-source-order'>{index + 1}</Text>
                  <Text className='message-source-name'>{source.fileName || '未命名文件'}</Text>
                </View>
                <Text className='message-source-tip'>点击查看原文</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export default MessageBubble

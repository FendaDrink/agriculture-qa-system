import { Text, View } from '@tarojs/components'
import React from 'react'
import { ChatMessage } from '../types/chat'
import './MessageBubble.scss'

interface Props {
  message: ChatMessage
}

const MessageBubble = ({ message }: Props) => {
  const isUser = message.sender === 1

  return (
    <View className={`message-row ${isUser ? 'is-user' : 'is-assistant'}`}>
      <View className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        <Text>{message.content}</Text>
      </View>
    </View>
  )
}

export default MessageBubble

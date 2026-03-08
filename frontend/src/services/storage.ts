import Taro from '@tarojs/taro'
import { ChatMessage, ChatSession } from '../types/chat'

const SESSION_KEY = 'agri:chat:sessions'
const MESSAGE_KEY = 'agri:chat:messages'

export const loadSessions = (): ChatSession[] => {
  return Taro.getStorageSync(SESSION_KEY) || []
}

export const saveSessions = (sessions: ChatSession[]) => {
  Taro.setStorageSync(SESSION_KEY, sessions)
}

export const loadMessages = (): ChatMessage[] => {
  return Taro.getStorageSync(MESSAGE_KEY) || []
}

export const saveMessages = (messages: ChatMessage[]) => {
  Taro.setStorageSync(MESSAGE_KEY, messages)
}

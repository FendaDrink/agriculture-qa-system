import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useEffect, useState } from 'react'
import { listFaqQuestions } from '@/services/chat'
import { FaqQuestionItem } from '@/types/chat'
import './index.scss'

const PREFILL_KEY = 'agri:chat:prefill-question'

const FaqPage = () => {
  const [faqList, setFaqList] = useState<FaqQuestionItem[]>([])

  useEffect(() => {
    listFaqQuestions(30).then((list) => {
      setFaqList(list)
    }).catch(() => {
      setFaqList([])
    })
  }, [])

  const askNow = (question: string) => {
    Taro.setStorageSync(PREFILL_KEY, question)
    Taro.switchTab({ url: '/pages/chat/index' })
  }

  return (
    <View className='faq-page safe-shell'>
      <Text className='faq-title'>高频问题参考</Text>
      <Text className='faq-desc'>根据真实提问自动统计，管理员也会手动维护推荐问题</Text>

      <ScrollView scrollY className='faq-scroll'>
        {faqList.length > 0 ? faqList.map((item) => (
          <View key={item.id} className='faq-card'>
            <Text className='faq-q'>{item.question}</Text>
            <View className='faq-card-foot'>
              <Text className='faq-source'>{item.source === 'manual' ? '精选问题' : `高频提问${item.frequency ? ` (${item.frequency})` : ''}`}</Text>
              <View className='faq-ask' onClick={() => askNow(item.question)}>
                <Text>去提问</Text>
              </View>
            </View>
          </View>
        )) : (
          <View className='faq-empty'>
            <Text>暂无高频问题，欢迎去问答页发起你的第一个问题</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default FaqPage

import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React from 'react'
import { getFaqList } from '@/services/chat'
import './index.scss'

const PREFILL_KEY = 'agri:chat:prefill-question'

const FaqPage = () => {
  const faqList = getFaqList()

  const askNow = (question: string) => {
    Taro.setStorageSync(PREFILL_KEY, question)
    Taro.switchTab({ url: '/pages/chat/index' })
  }

  return (
    <View className='faq-page'>
      <Text className='faq-title'>高频问题参考</Text>
      <Text className='faq-desc'>点击“去提问”会把问题带到问答页直接发起咨询</Text>

      <ScrollView scrollY className='faq-scroll'>
        {faqList.map((item) => (
          <View key={item.id} className='faq-card'>
            <Text className='faq-card-title'>{item.title}</Text>
            <Text className='faq-q'>问：{item.question}</Text>
            <Text className='faq-a'>答：{item.answer}</Text>
            <View className='faq-ask' onClick={() => askNow(item.question)}>
              <Text>去提问</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

export default FaqPage

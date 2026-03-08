import { Swiper, SwiperItem, Text, View, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React from 'react'
import './index.scss'

const banners = [
  {
    id: 'b1',
    title: '智慧农业 · 快速问答',
    desc: '输入作物、症状、地区、天气，实时获得管理建议',
    img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'b2',
    title: '知识库检索',
    desc: '基于农业资料的检索问答，提供更可信的参考',
    img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'b3',
    title: '多模态输入',
    desc: '后续支持语音提问、图片识别，敬请期待',
    img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
]

const HomePage = () => {
  return (
    <View className='home-page'>
      <Swiper
        className='home-swiper'
        indicatorDots
        autoplay
        circular
        interval={4200}
        indicatorColor='rgba(255,255,255,0.4)'
        indicatorActiveColor='#0f6a43'
      >
        {banners.map((item) => (
          <SwiperItem key={item.id}>
            <View className='banner'>
              <Image mode='aspectFill' className='banner-img' src={item.img} />
              <View className='banner-mask' />
              <View className='banner-text'>
                <Text className='banner-title'>{item.title}</Text>
                <Text className='banner-desc'>{item.desc}</Text>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      <View className='cta'>
        <Button className='cta-btn' onClick={() => Taro.switchTab({ url: '/pages/chat/index' })}>
          立即开始提问
        </Button>
      </View>
    </View>
  )
}

export default HomePage

import { Text, View, WebView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useMemo, useState } from 'react'
import './index.scss'

const PdfViewerPage = () => {
  const params = Taro.getCurrentInstance().router?.params || {}
  const title = decodeURIComponent(params.title || '知识来源')
  const rawUrl = decodeURIComponent(params.url || '')
  const safeUrl = useMemo(() => {
    if (!rawUrl) return ''
    return rawUrl.replace(/\s/g, '')
  }, [rawUrl])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  if (!safeUrl) {
    return (
      <View className='pdf-empty'>
        <Text className='pdf-empty-title'>{title}</Text>
        <Text className='pdf-empty-tip'>未找到可预览的文件地址</Text>
      </View>
    )
  }

  return (
    <View className='pdf-page'>
      <WebView
        src={safeUrl}
        onLoad={() => {
          setLoading(false)
          setLoadError('')
        }}
        onError={() => {
          setLoading(false)
          setLoadError('预览加载失败，请稍后重试')
        }}
      />
      {loading ? (
        <View className='pdf-overlay'>
          <Text className='pdf-overlay-text'>PDF 加载中...</Text>
        </View>
      ) : null}
      {loadError ? (
        <View className='pdf-overlay'>
          <Text className='pdf-overlay-text'>{loadError}</Text>
          <Text
            className='pdf-overlay-action'
            onClick={() => {
              setLoading(true)
              setLoadError('')
              Taro.redirectTo({
                url: `/pages/pdf-viewer/index?url=${encodeURIComponent(safeUrl)}&title=${encodeURIComponent(title)}`,
              })
            }}
          >
            点击重试
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default PdfViewerPage

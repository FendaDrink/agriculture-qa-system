import { Text, View } from '@tarojs/components'
import React from 'react'
import './QuestionChips.scss'

interface Props {
  questions: string[]
  onSelect: (q: string) => void
}

const QuestionChips = ({ questions, onSelect }: Props) => {
  return (
    <View className='chips-wrap'>
      {questions.map((item) => (
        <View key={item} className='chip-item' onClick={() => onSelect(item)}>
          <Text>{item}</Text>
        </View>
      ))}
    </View>
  )
}

export default QuestionChips

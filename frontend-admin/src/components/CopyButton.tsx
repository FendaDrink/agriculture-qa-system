import { Button, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { useState } from 'react'

interface CopyButtonProps {
  text: string
  label?: string
  size?: 'small' | 'middle' | 'large'
  type?: 'text' | 'link' | 'default' | 'primary' | 'dashed'
}

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = '复制',
  size = 'small',
  type = 'text',
}) => {
  const [copying, setCopying] = useState(false)

  return (
    <Button
      size={size}
      type={type}
      icon={<CopyOutlined />}
      loading={copying}
      onClick={async (e) => {
        e.stopPropagation()
        try {
          setCopying(true)
          await copyText(text)
          message.success('已复制到剪贴板')
        } catch (error) {
          message.error('复制失败')
        } finally {
          setCopying(false)
        }
      }}
    >
      {label}
    </Button>
  )
}

export default CopyButton


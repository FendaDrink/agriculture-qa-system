import Taro from '@tarojs/taro'
import {getAppSettings} from '@/services/settings'

function base64Decode(str: string) {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let output = ''
  let chr1, chr2, chr3
  let enc1, enc2, enc3, enc4
  let i = 0

  // 清理非 Base64 字符
  str = str.replace(/[^A-Za-z0-9+/=]/g, '')

  while (i < str.length) {
    enc1 = base64Chars.indexOf(str.charAt(i++))
    enc2 = base64Chars.indexOf(str.charAt(i++))
    enc3 = base64Chars.indexOf(str.charAt(i++))
    enc4 = base64Chars.indexOf(str.charAt(i++))

    chr1 = (enc1 << 2) | (enc2 >> 4)
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
    chr3 = ((enc3 & 3) << 6) | enc4

    output += String.fromCharCode(chr1)
    if (enc3 !== 64) output += String.fromCharCode(chr2)
    if (enc4 !== 64) output += String.fromCharCode(chr3)
  }
  return output
}

export const ensureAuthed = async () => {
  const { token } = getAppSettings()
  if (!token) {
    const current = Taro.getCurrentPages()?.slice(-1)[0]
    const route = (current as any)?.route || ''
    if (!['pages/login', 'pages/home', 'pages/faq'].includes(route)) {
      await Taro.navigateTo({ url: '/pages/login/index' })
      return false
    }
  }
  return true
}

export const parseBearerTokenPayload = (bearerToken: string) => {
  try {
    // 步骤1：校验并提取纯 Token（去掉 Bearer 前缀）
    if (!bearerToken) {
      throw new Error('Token 格式错误：必须是字符串类型')
    }
    // 去除首尾空格，分割 Bearer 和 Token 主体（兼容大小写/多空格）
    const tokenParts = bearerToken.trim().split(/\s+/)
    const pureToken = tokenParts.length === 2 && tokenParts[0].toLowerCase() === 'bearer'
        ? tokenParts[1]
        : bearerToken // 兼容直接传入纯 Token 的情况

    // 步骤2：分割 JWT（header.payload.signature），提取 payload 部分
    const jwtParts = pureToken.split('.')
    if (jwtParts.length !== 3) {
      throw new Error('Token 格式错误：不是标准的 JWT 格式')
    }
    const payloadBase64 = jwtParts[1]

    // 步骤3：Base64 补位（JWT 的 payload 可能省略 = 补位符，需补齐）
    const paddedPayload = payloadBase64.padEnd(payloadBase64.length + (4 - payloadBase64.length % 4) % 4, '=')

    // 步骤4：解码并转成 JSON 对象
    const decodedStr = base64Decode(paddedPayload)
    return JSON.parse(decodedStr)
  } catch (error) {
    return null
  }
}

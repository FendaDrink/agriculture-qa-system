import dayjs from 'dayjs'
import chalk from 'chalk'

export interface LogRequest {
  originalUrl: string
  method: string
  ip: string
  responseTime?: number
  query?: Record<string, any>
  body?: Record<string, any>
  [key: string]: any
}

export class LoggerUtil {
  /**
   * 输出格式化的时间
   */
  static formatDate(date: Date): string {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
  }

  /**
   * 根据方法和请求对象，返回请求参数
   */
  static parameters(request: LogRequest, method: string): string {
    let paramMsg = ''
    const m = method?.toUpperCase()

    // GET/DELETE - 打印 query
    if (['GET', 'DELETE'].includes(m) && request.query && Object.keys(request.query).length > 0) {
      paramMsg += ` Query: ${JSON.stringify(request.query)}`
    }
    // POST/PUT/PATCH - 打印 body
    else if (
      ['POST', 'PUT', 'PATCH'].includes(m) &&
      request.body &&
      Object.keys(request.body).length > 0
    ) {
      paramMsg += ` Body: ${JSON.stringify(request.body)}`
    }
    return paramMsg
  }

  static printLog(request: LogRequest, statusCode: number, message: string, data = null) {
    const { originalUrl, method, ip = '-', responseTime, httpVersion } = request
    const timeStr = this.formatDate(new Date())
    const timeMsg = responseTime ? `${responseTime.toFixed(1)} ms` : ''
    const paramMsg = this.parameters(request, method)
    const protoVersion = httpVersion ? 'HTTP/' + httpVersion : ''

    const logMessage = `
      [${timeStr}] [${ip}] ${method} ${originalUrl} ${protoVersion} ${statusCode} ${timeMsg}
      Message: ${message}
      Data: ${data}
     ${paramMsg}
    `
      .trim()
      .replace(/\n\s*\n/g, '\n')

    // 根据状态码呈现不同颜色
    if (statusCode >= 200 && statusCode < 300) {
      console.log(chalk.green(logMessage))
    } else if (statusCode >= 300 && statusCode < 400) {
      console.warn(chalk.yellow(logMessage))
    } else {
      console.error(chalk.red(logMessage))
    }
  }
}

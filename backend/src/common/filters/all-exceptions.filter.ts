// 全局异常过滤器
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { STATUS_CODES } from '../status-code'
import { LoggerUtil } from '../utils/logger.util'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    let code: number | string
    let message: string | object

    const ctx = host.switchToHttp()
    const request = ctx.getRequest()
    const response = ctx.getResponse()

    // 请求参数异常处理
    if (exception instanceof BadRequestException) {
      const errors = exception.getResponse() as any
      const code = exception.getStatus()
      ;(response.locals as any).__appCode = code
      ;(response.locals as any).__appMessage = '请求参数错误：' + errors.message.toString()
      ;(response.locals as any).__errorMessage = '请求参数错误：' + errors.message.toString()
      LoggerUtil.printLog(request, code, '请求参数错误:' + errors.message.toString())
      return response.status(200).json({
        code,
        message: '请求参数错误：' + errors.message.toString(),
        data: null,
      })
    }

    // 其他全局异常过滤
    if (exception instanceof HttpException) {
      message = exception.getResponse()
      code = exception.getStatus()
      if (typeof message === 'object' && message !== null) {
        if (message.hasOwnProperty('message')) {
          message = message['message']
        } else {
          message = STATUS_CODES[code]
        }
      }
    } else if (exception instanceof Error) {
      code = HttpStatus.INTERNAL_SERVER_ERROR
      message = exception.message || STATUS_CODES[code]
      ;(response.locals as any).__errorStack = exception.stack || null
    } else {
      code = HttpStatus.BAD_REQUEST
      message = STATUS_CODES[code]
    }
    ;(response.locals as any).__appCode = Number(code)
    ;(response.locals as any).__appMessage = '' + message
    ;(response.locals as any).__errorMessage = '' + message
    LoggerUtil.printLog(request, code, '' + message)
    response.status(200).json({
      code,
      message,
      data: null,
    })
  }
}

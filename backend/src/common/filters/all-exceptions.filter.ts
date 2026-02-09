// 全局异常过滤器
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { STATUS_CODES } from '../status-code'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()

    let code: number | string
    let message: string | object

    // 请求参数异常处理
    if (exception instanceof BadRequestException) {
      const errors = exception.getResponse() as any
      const code = exception.getStatus()
      Logger.error('请求参数异常:' + errors.message)
      return response.status(200).json({
        code,
        message: '请求参数验证失败',
        errors: errors.message.toString(),
        data: null,
      })
    }

    // 其他全局异常过滤
    if (exception instanceof HttpException) {
      message = exception.getResponse()
      code = exception.getStatus()
    } else if (exception instanceof Error) {
      code = HttpStatus.INTERNAL_SERVER_ERROR
      message = STATUS_CODES[code]
    } else {
      code = HttpStatus.BAD_REQUEST
      message = STATUS_CODES[code]
    }

    Logger.error('捕获到了全局异常：' + message)
    response.status(200).json({
      code,
      message,
      data: null,
    })
  }
}

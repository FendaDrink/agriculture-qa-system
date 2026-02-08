// 全局异常过滤器
import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const status = exception instanceof Error ? 500 : 400
    console.log(exception)
    response.status(status).json({
      code: status,
      message: exception instanceof Error ? '服务器内部错误' : '请求参数错误',
      data: null,
    })
  }
}

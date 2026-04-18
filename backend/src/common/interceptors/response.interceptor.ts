// 全局拦截器
import { Injectable } from '@nestjs/common'
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ResponseData } from '../interfaces/api-response.interface'
import { STATUS_CODES } from '../status-code'
import { LoggerUtil } from '../utils/logger.util'

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseData<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseData<T>> {
    const now = Date.now()
    const req = context.switchToHttp().getRequest()
    const res = context.switchToHttp().getResponse()

    return next.handle().pipe(
      map((data) => {
        const responseTime = Date.now() - now
        const statusCode =
          res.statusCode >= 200 && res.statusCode < 400 ? 200 : res.statusCode || 200
        ;(res.locals as any).__appCode = statusCode
        ;(res.locals as any).__appMessage = res.message || STATUS_CODES[statusCode]
        LoggerUtil.printLog(
          {
            responseTime,
            ...req,
          },
          statusCode,
          res.message || STATUS_CODES[statusCode],
          JSON.stringify(data),
        )
        return {
          code: statusCode,
          message: res.message || STATUS_CODES[statusCode],
          data,
        }
      }),
    )
  }
}

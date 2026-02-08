// 全局拦截器
import { Injectable } from '@nestjs/common'
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ResponseData } from '../interfaces/api-response.interface'

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseData<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseData<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200, // 请求成功时的状态码
        message: '请求成功',
        data: data, // 返回的数据
      })),
    )
  }
}

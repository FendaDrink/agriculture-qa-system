import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  // 1. 创建应用
  const app = await NestFactory.create(AppModule)

  // 2.跨域请求配置
  app.enableCors({
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    origin: 'localhost:8000',
  })

  // 3.全局应用响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor())

  // 4.启用全局数据验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // 自动类型转换
      whitelist: true, // 丢弃 DTO 里未定义的字段
      forbidNonWhitelisted: true, // 可选：禁止多余字段
    }),
  )

  // 5. 全局应用异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter())

  // 6.1 获取 ConfigService 实例
  const configService = app.get(ConfigService)

  // 6.2 获取 DATABASE_URL 配置
  const dbHost = configService.get<string>('DB_HOST')
  const dbPort = configService.get<number>('DB_PORT')
  Logger.log(`Connecting to database at ${dbHost}:${dbPort}`)

  // 7. 启动实例
  await app.listen(configService.get<number>('PORT', 3000))
}
bootstrap()

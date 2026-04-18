import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { RequestLogEntity } from './entities/requestLog.entity'
import { LogsController } from './logs.controller'
import { RequestLogMiddleware } from './request-log.middleware'
import { LogsScheduler } from './logs.scheduler'
import { LogsService } from './logs.service'

@Module({
  imports: [TypeOrmModule.forFeature([RequestLogEntity], 'rag'), AuthModule],
  controllers: [LogsController],
  providers: [LogsService, RequestLogMiddleware, LogsScheduler],
  exports: [LogsService],
})
export class LogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLogMiddleware).forRoutes('*')
  }
}


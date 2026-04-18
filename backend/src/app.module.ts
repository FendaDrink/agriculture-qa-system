import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { UserModule } from './modules/user/user.module'
import { DatabaseModule } from './modules/database/database.module'
import { CollectionEntity } from './modules/database/entities/collection.entity'
import { DocumentEntity } from './modules/database/document/entities/document.entity'
import { RoleEntity } from './modules/user/entities/role.entity'
import { UserEntity } from './modules/user/entities/user.entity'
import { UserPwdEntity } from './modules/user/entities/userPwd.entity'
import { ChatModule } from './modules/chat/chat.module'
import { ChatSessionEntity } from './modules/chat/session/entities/chatSession.entity'
import { ChatMessageEntity } from './modules/chat/message/entities/chatMessage.entity'
import { RequestLogEntity } from './modules/logs/entities/requestLog.entity'
import { LogsModule } from './modules/logs/logs.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置在应用的所有模块中都可以访问
    }),
    // 主业务库
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // 数据库类型
        host: configService.get<string>('DB_HOST'), // 数据库地址
        port: configService.get<number>('DB_PORT'), // 数据库端口，默认 3306
        username: configService.get<string>('DB_USERNAME'), // 数据库用户名
        password: configService.get<string>('DB_PASSWORD'), // 数据库密码
        database: configService.get<string>('DB_DATABASE'), // 数据库名称
        timezone: '+08:00', // 设置时区
        entities: [RoleEntity, UserEntity, UserPwdEntity, ChatSessionEntity, ChatMessageEntity],
        synchronize: true, // 开发环境中开启自动同步，生产环境应关闭此选项
      }),
      inject: [ConfigService],
    }),
    // 知识库
    TypeOrmModule.forRootAsync({
      name: 'rag',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // 数据库类型
        host: configService.get<string>('DB_HOST'), // 数据库地址
        port: configService.get<number>('DB_PORT'), // 数据库端口，默认 3306
        username: configService.get<string>('DB_USERNAME'), // 数据库用户名
        password: configService.get<string>('DB_PASSWORD'), // 数据库密码
        database: configService.get<string>('DB_DATABASE_RAG'), // 数据库名称
        timezone: '+08:00', // 设置时区
        entities: [CollectionEntity, DocumentEntity, RequestLogEntity],
        synchronize: true, // 开发环境中开启自动同步，生产环境应关闭此选项
        logger: 'file',
      }),
      inject: [ConfigService],
    }),
    UserModule, // 用户模块
    DatabaseModule, // 向量库模块
    ChatModule, // 聊天模块
    LogsModule, // 日志模块
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

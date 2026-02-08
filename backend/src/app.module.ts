import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { UserModule } from './modules/user/user.module'
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置在应用的所有模块中都可以访问
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // 数据库类型
        host: configService.get<string>('DB_HOST'), // 数据库地址
        port: configService.get<number>('DB_PORT'), // 数据库端口，默认 3306
        username: configService.get<string>('DB_USERNAME'), // 数据库用户名
        password: configService.get<string>('DB_PASSWORD'), // 数据库密码
        database: configService.get<string>('DB_DATABASE'), // 数据库名称
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // 连接所有的实体文件
        synchronize: true, // 开发环境中开启自动同步，生产环境应关闭此选项
      }),
      inject: [ConfigService],
    }),
    UserModule, // 用户模块
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

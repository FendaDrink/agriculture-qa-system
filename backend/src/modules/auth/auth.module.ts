import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserPwdEntity } from '../user/entities/userPwd.entity'
import { UserPwdDAO } from '../user/dao/userPwd.dao'
import { AuthService } from './auth.service'
import { EncryptionService } from './encryption/encryption.service'
import { JwtModule } from '@nestjs/jwt'
import { UserDAO } from '../user/dao/user.dao'
import { UserEntity } from '../user/entities/user.entity'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from './auth.guard'
import type { StringValue } from 'ms'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPwdEntity, UserEntity]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<StringValue>('JWT_EXPIRES_TIME') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, EncryptionService, AuthGuard, UserPwdDAO, UserDAO],
  controllers: [AuthController],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}

import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserPwdEntity } from '../user/entities/userPwd.entity'
import { UserPwdDAO } from '../user/dao/userPwd.dao'
import { AuthService } from './auth.service'
import { EncryptionService } from './encryption/encryption.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserPwdEntity])],
  providers: [AuthService, EncryptionService, UserPwdDAO],
  controllers: [AuthController],
})
export class AuthModule {}

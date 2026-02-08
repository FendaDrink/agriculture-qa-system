import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { UserDAO } from './dao/user.dao'
import { UserPwdDAO } from './dao/userPwd.dao'
import { RoleDao } from './dao/role.dao'
import { UserPwdEntity } from './entities/userPwd.entity'
import { RoleEntity } from './entities/role.entity'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserPwdEntity, RoleEntity])],
  providers: [UserService, UserDAO, UserPwdDAO, RoleDao],
  controllers: [UserController],
})
export class UserModule {}

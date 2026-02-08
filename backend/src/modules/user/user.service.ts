import { Injectable } from '@nestjs/common'
import { UserDAO } from './dao/user.dao'
import { RoleDao } from './dao/role.dao'
import { UserPwdDAO } from './dao/userPwd.dao'
import { UserDto } from './dto/user.dto'
import { DataSource } from 'typeorm'

@Injectable()
export class UserService {
  constructor(
    private readonly dataSource: DataSource,
    private userDAO: UserDAO, // 注入 UserDAO
    private userPwdDAO: UserPwdDAO, // 注入 UserPwdDAO
    private roleDAO: RoleDao, // 注入 RoleDAO
  ) {}

  // ---- 用户相关 ----
  /**
   * 获取所有用户
   */
  async findAllUsers(): Promise<UserDto[]> {
    return this.userDAO.findAllUsers()
  }

  /**
   * 创建新用户 1.更新 user 表 2. 更新 user_pwd 表
   */
  async create(userData: UserDto): Promise<UserDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 创建用户
      const user = await this.userDAO.createUser(userData, manager)

      // 2. 创建用户-密码对
      const userPwdData = {
        userId: user.id,
        pwdHash: '',
      }
      await this.userPwdDAO.createUserPwd(userPwdData, manager)

      return this.userDAO.toUserDto(user)
    })
  }
}

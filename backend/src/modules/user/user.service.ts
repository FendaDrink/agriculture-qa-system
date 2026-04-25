import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { UserDAO } from './dao/user.dao'
import { RoleDao } from './dao/role.dao'
import { UserPwdDAO } from './dao/userPwd.dao'
import { UserDto } from './dto/user.dto'
import { DataSource } from 'typeorm'
import { UserPwdDto } from './dto/userPwd.dto'
import { EncryptionService } from '../auth/encryption/encryption.service'
import { LoginDto } from './dto/login.dto'
import { CreateUserDto } from './dto/createUser.dto'
import { UpdateUserDto } from './dto/updateUser.dto'
import { cityNameToCode, HubeiCityCode } from '../../common/constants/city'

interface RequestUser {
  userId: string
  roleId: number
  city?: string | number
}

@Injectable()
export class UserService {
  constructor(
    private readonly dataSource: DataSource,
    private userDAO: UserDAO, // 注入 UserDAO
    private userPwdDAO: UserPwdDAO, // 注入 UserPwdDAO
    private roleDAO: RoleDao, // 注入 RoleDAO
    private readonly encryptionService: EncryptionService, // 注入 EncryptionService
  ) {}

  // ---- 用户相关 ----
  /**
   * 获取所有用户
   */
  async findAllUsers(currentUser: RequestUser): Promise<UserDto[]> {
    const users = await this.userDAO.findAllUsers()
    if (currentUser.roleId === 0) {
      return users
    }

    if (currentUser.roleId === 1) {
      const currentCity = cityNameToCode(currentUser.city, HubeiCityCode.WUHAN)
      return users.filter((item) => Number(item.city) === currentCity && [1, 2].includes(Number(item.roleId)))
    }

    return users.filter((item) => item.id === currentUser.userId)
  }

  /**
   * 判断某个用户ID的用户是否存在
   * @param id 用户ID
   * @param isExistType 判断存在 true 判断不存在 false
   */
  async userExist(id: string, isExistType: boolean): Promise<UserDto> {
    const user = await this.userDAO.findUserById(id)
    const responseMsg = isExistType ? '用户记录不存在' : '该用户已经存在'
    if ((!user && isExistType) || (user && !isExistType)) {
      throw new HttpException(responseMsg, HttpStatus.BAD_REQUEST)
    }
    return user as UserDto
  }

  /**
   * 创建新用户 1.更新 user 表 2. 更新 user_pwd 表
   * @param userData
   */
  async create(userData: CreateUserDto): Promise<UserDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验用户是否存在
      await this.userExist(userData.id, false)
      if (!userData.username) {
        userData.username = userData.id
      }
      const cityCode = cityNameToCode(userData.city as any, HubeiCityCode.WUHAN)
      userData.city = cityCode as any

      if (!userData.password) {
        throw new HttpException('密码不能为空', HttpStatus.BAD_REQUEST)
      }

      // 2. 创建用户
      const user = await this.userDAO.createUser(
        {
          ...userData,
          city: cityCode as any,
        },
        manager,
      )

      // 3. 创建用户-密码对
      // 3.1 构造新的加盐密码
      const saltedPwd = await this.encryptionService.hashPassword(userData.password)
      const userPwdData = {
        userId: user.id,
        pwdHash: saltedPwd,
      }
      await this.userPwdDAO.createUserPwd(userPwdData, manager)

      return this.userDAO.toUserDto(user)
    })
  }

  /**
   * 更新用户信息
   * @param userData
   */
  async update(userData: UpdateUserDto): Promise<UserDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验用户是否存在
      const user = await this.userExist(userData.id, true)

      const newUserData = {
        ...user,
        ...userData,
        id: user.id,
        city: cityNameToCode((userData as any).city, (user as any).city ?? HubeiCityCode.WUHAN),
      }

      // 2. 更新用户信息
      const newUser = await this.userDAO.updateUser(newUserData, manager)

      return this.userDAO.toUserDto(newUser)
    })
  }

  /**
   * 修改密码
   * @param userPwdData
   */
  async updatePwd(userPwdData: LoginDto): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验用户是否存在
      const user = await this.userPwdDAO.findUserPwdById(userPwdData.userId)
      if (!user) {
        throw new HttpException('用户记录不存在', HttpStatus.BAD_REQUEST)
      }

      // 2. 构造新的加盐密码
      const saltedPwd = await this.encryptionService.hashPassword(userPwdData.password)

      // 3. 构造新的 userPwdData
      const newUserPwdData = new UserPwdDto()
      newUserPwdData.userId = user.userId
      newUserPwdData.pwdHash = saltedPwd

      // 2. 更新用户-密码对信息
      await this.userPwdDAO.updateUserPwd(newUserPwdData, manager)
    })
  }

  /**
   * 删除指定用户ID（注销用户）
   * @parm userId
   */
  async delete(userId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验用户是否存在
      await this.userExist(userId, true)

      // 2. 删除用户表中的记录
      await this.userDAO.deleteUser(userId, manager)

      // 3. 删除用户-密码对表中的记录
      await this.userPwdDAO.deleteUserPwd(userId, manager)
    })
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { LoginDto } from '../user/dto/login.dto'
import { UserPwdDAO } from '../user/dao/userPwd.dao'
import { EncryptionService } from './encryption/encryption.service'
import { JwtService } from '@nestjs/jwt'
import { UserDAO } from '../user/dao/user.dao'
import { TokenDto } from './dto/token.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private userPwdDAO: UserPwdDAO, // 注入 userPwdDAO
    private userDAO: UserDAO, // 注入 userDAO
    private readonly encryptionService: EncryptionService, // 注入 encryptionService
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 登陆
   */
  async login(loginDto: LoginDto): Promise<TokenDto> {
    const userPwd = await this.userPwdDAO.findUserPwdById(loginDto.userId)
    const userInfo = await this.userDAO.findUserById(loginDto.userId)
    // 1. 用户存在校验
    if (!userInfo || !userPwd) {
      throw new HttpException('该用户不存在', HttpStatus.NOT_FOUND)
    }
    const hash = userPwd.pwdHash
    const password = loginDto.password
    const bool = await this.encryptionService.comparePassword(password, hash)
    // 2. 密码校验
    if (!bool) {
      throw new HttpException('密码错误，请重新输入', HttpStatus.UNAUTHORIZED)
    }

    // 3. 组装 payload
    const payload = {
      userId: userPwd.userId,
      roleId: userInfo.roleId,
      username: userInfo.username,
      city: userInfo.city,
    }

    return {
      token: this.jwtService.sign(payload),
    }
  }
}

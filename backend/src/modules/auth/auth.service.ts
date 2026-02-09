import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { LoginDto } from '../user/dto/login.dto'
import { UserPwdDAO } from '../user/dao/userPwd.dao'
import { EncryptionService } from './encryption/encryption.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private userPwdDAO: UserPwdDAO, // 注入 userPwdDAO
    private readonly encryptionService: EncryptionService, // 注入 encryptionService
  ) {}

  /**
   * 登陆
   */
  async login(loginDto: LoginDto): Promise<string> {
    const userPwd = await this.userPwdDAO.findUserPwdById(loginDto.userId)
    if (!userPwd) {
      throw new HttpException('该用户不存在', HttpStatus.BAD_REQUEST)
    }
    const hash = userPwd.pwdHash
    const password = loginDto.password
    const bool = this.encryptionService.comparePassword(password, hash)
    console.log(password, hash, bool)
    if (!bool) {
      throw new HttpException('密码错误', HttpStatus.BAD_REQUEST)
    }

    return '登录成功'
  }
}

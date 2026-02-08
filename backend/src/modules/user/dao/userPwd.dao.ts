import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { UserPwdEntity } from '../entities/userPwd.entity'
import { UserPwdDto } from '../dto/userPwd.dto'
import { UserEntity } from '../entities/user.entity'

@Injectable()
export class UserPwdDAO {
  constructor(
    @InjectRepository(UserPwdEntity)
    private userPwdRepository: Repository<UserPwdEntity>, // 注入 Repository
  ) {}

  /**
   * 查找所有用户-密码对
   */
  async findAllUsers(): Promise<UserPwdDto[]> {
    return this.userPwdRepository.find()
  }

  /**
   * 创建用户-密码对
   * @param userPwdDto
   * @param manager
   */
  async createUserPwd(userPwdDto: UserPwdDto, manager: EntityManager): Promise<UserPwdDto> {
    const userPwd = manager.create(UserPwdEntity, userPwdDto) // 创建 UserPwd 实体
    return this.userPwdRepository.save(userPwd) // 保存到数据库
  }

  /**
   * 根据用户ID查找用户-密码对
   * @param userId
   */
  async findUserPwdById(userId: string): Promise<UserPwdDto> {
    return this.userPwdRepository.findOne({
      where: { userId },
    }) // 查找用户
  }

  /**
   * 更新指定用户ID的用户-密码对（修改密码）
   * @param userId
   * @param userPwdDto
   * @param manager
   */
  async updateUserPwd(
    userId: number,
    userPwdDto: UserPwdDto,
    manager: EntityManager,
  ): Promise<UserPwdDto> {
    const userPwd = await manager.preload(UserPwdEntity, {
      userId,
      ...userPwdDto,
    })

    if (!userPwd) {
      throw new NotFoundException('用户不存在')
    }

    return manager.save(userPwd)
  }

  /**
   * 根据指定用户ID删除用户-密码对（注销）
   * @param userId
   * @param manager
   */
  async deleteUserPwd(userId: string, manager: EntityManager): Promise<void> {
    await manager.delete(UserEntity, userId)
  }
}

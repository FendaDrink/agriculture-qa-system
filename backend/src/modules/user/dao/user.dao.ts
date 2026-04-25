import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'
import { UserDto } from '../dto/user.dto'
import { cityNameToCode } from '../../../common/constants/city'

@Injectable()
export class UserDAO {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>, // 注入 Repository
  ) {}

  /**
   * 查找所有用户
   */
  async findAllUsers(): Promise<UserDto[]> {
    const users = await this.userRepository.find()
    return users.map((item) => this.toUserDto(item))
  }

  /**
   * 创建用户
   * @param userDto
   * @param manager
   */
  async createUser(userDto: Partial<UserEntity>, manager: EntityManager): Promise<UserEntity> {
    const userEntity = manager.create(UserEntity, userDto) // 创建 User 实体
    return manager.save(userEntity) //保存至数据库中
  }

  /**
   * 根据用户ID查找用户
   * @param id
   */
  async findUserById(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    }) // 查找用户
    return user ? this.toUserDto(user) : null
  }

  /**
   * 更新指定用户ID的用户
   * @param userDto
   * @param manager
   */
  async updateUser(userDto: Partial<UserEntity>, manager: EntityManager): Promise<UserEntity> {
    const user = await manager.preload(UserEntity, userDto as any) // 更新用户
    if (!user) {
      throw new Error('用户不存在')
    }
    return manager.save(user as UserEntity)
  }

  /**
   * 根据指定用户ID删除用户
   * @param id
   * @param manager
   */
  async deleteUser(id: string, manager: EntityManager): Promise<void> {
    await manager.delete(UserEntity, id)
  }

  toUserDto(user: UserEntity): UserDto {
    return {
      ...user,
      city: cityNameToCode((user as any)?.city),
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'
import { UserDto } from '../dto/user.dto'

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
    return this.userRepository.find()
  }

  /**
   * 创建用户
   * @param userDto
   * @param manager
   */
  async createUser(userDto: Partial<UserDto>, manager: EntityManager): Promise<UserDto> {
    const userEntity = manager.create(UserEntity, userDto) // 创建 User 实体
    return manager.save(userEntity) //保存至数据库中
  }

  /**
   * 根据用户ID查找用户
   * @param id
   */
  async findUserById(id: string): Promise<UserDto> {
    return this.userRepository.findOne({
      where: { id },
    }) // 查找用户
  }

  /**
   * 更新指定用户ID的用户
   * @param id
   * @param userDto
   * @param manager
   */
  async updateUser(id: string, userDto: UserDto, manager: EntityManager): Promise<UserDto> {
    const user = await manager.preload(UserEntity, {
      id,
      ...userDto,
    }) // 更新用户

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    return manager.save(user)
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
    }
  }
}

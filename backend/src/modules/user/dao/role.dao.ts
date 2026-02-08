import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RoleEntity } from '../entities/role.entity'

@Injectable()
export class RoleDao {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>, // 注入 Repository
  ) {}

  /**
   * 查找所有用户-密码对
   */
  async findAllUserPwd(): Promise<RoleEntity[]> {
    return this.roleRepository.find()
  }

  /**
   * 创建角色
   * @param createRoleDto
   */
  async createRole(createRoleDto: RoleEntity): Promise<RoleEntity> {
    const user = this.roleRepository.create(createRoleDto) // 创建 Role 实体
    return this.roleRepository.save(user) // 保存数据库
  }

  /**
   * 根据角色ID查找角色
   * @param id
   */
  async findRoleById(id: number): Promise<RoleEntity> {
    return this.roleRepository.findOne({
      where: { id },
    })
  }

  /**
   * 更新指定角色ID的角色
   * @param id
   * @param updateUserDto
   */
  async updateRole(id: number, updateUserDto: Partial<RoleEntity>): Promise<RoleEntity> {
    await this.roleRepository.update(id, updateUserDto)
    return this.roleRepository.findOne({
      where: { id },
    })
  }

  /**
   * 根据角色ID删除角色
   * @param id
   */
  async deleteUser(id: number): Promise<void> {
    await this.roleRepository.delete(id)
  }
}

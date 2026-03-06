/**
 * role 表
 */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'
import { IsInt, IsOptional, IsString } from 'class-validator'

@Entity('role')
export class RoleEntity {
  @PrimaryGeneratedColumn({ comment: '权限ID' })
  @IsInt()
  id: number

  @Column({ name: 'role_name', comment: '权限名称' })
  @IsString()
  roleName: string

  @Column({ comment: '权限描述' })
  @IsString()
  description: string

  @Column({ type: 'simple-json', nullable: true, comment: '权限' })
  @IsOptional()
  @IsString()
  permissions?: Record<string, any>
}

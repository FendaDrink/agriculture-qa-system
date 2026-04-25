/**
 * user 表
 */
import {
  Entity,
  Column,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { IsInt, IsString } from 'class-validator'

@Entity('user')
export class UserEntity {
  @PrimaryColumn({ comment: '用户ID' })
  @IsString()
  id: string

  @Column({ comment: '用户名' })
  @IsString()
  username: string

  @Column({ type: 'int', comment: '所属城市编码', default: 1 })
  @IsInt()
  city: number

  @Column({ name: 'role_id', comment: '权限ID' })
  @JoinColumn({ name: 'id' })
  @IsInt()
  roleId: number

  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '创建时间' })
  createTime: Date

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', comment: '修改时间' })
  updateTime: Date

  @Column({ comment: '状态 0 失效 1 正常' })
  @IsInt()
  status: number
}

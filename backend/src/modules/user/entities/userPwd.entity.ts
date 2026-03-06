/**
 * user_pwd 表
 */
import { Entity, Column, PrimaryColumn, JoinColumn } from 'typeorm'
import { IsString } from 'class-validator'

@Entity('user_pwd')
export class UserPwdEntity {
  @PrimaryColumn({ name: 'user_id', comment: '用户ID' })
  @JoinColumn({ name: 'id' })
  @IsString()
  userId: string

  @Column({ name: 'pwd_hash', comment: '密码哈希' })
  @IsString()
  pwdHash: string
}

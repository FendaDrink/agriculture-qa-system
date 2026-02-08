/**
 * user_pwd 表
 */
import { Entity, Column, PrimaryColumn } from 'typeorm'

@Entity('user_pwd')
export class UserPwdEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId: string

  @Column({ name: 'pwd_hash' })
  pwdHash: string
}

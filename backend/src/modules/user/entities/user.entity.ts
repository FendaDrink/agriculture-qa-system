/**
 * user 表
 */
import { Entity, Column, JoinColumn, PrimaryColumn } from 'typeorm'

@Entity('user')
export class UserEntity {
  @PrimaryColumn()
  id: string

  @Column()
  username: string

  @Column({ name: 'role_id' })
  @JoinColumn({ name: 'id' })
  roleId: number
}

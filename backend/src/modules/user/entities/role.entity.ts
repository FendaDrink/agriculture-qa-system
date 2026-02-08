/**
 * role 表
 */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('role')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'role_name' })
  roleName: string

  @Column()
  description: string

  @Column('simple-json')
  permissions: Record<string, any>
}

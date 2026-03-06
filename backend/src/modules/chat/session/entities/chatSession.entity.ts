/**
 * chat_sessions 表
 */
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { IsInt, IsString } from 'class-validator'

@Entity('chat_sessions')
export class ChatSessionEntity {
  @PrimaryColumn({ comment: '会话ID' })
  @IsString()
  id: string

  @Column({ comment: '会话标题' })
  @IsString()
  title: string

  @Column({ name: 'create_by', comment: '创建用户' })
  @IsString()
  createBy: string

  @Column({ comment: '状态' })
  @IsInt()
  status: number

  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '创建时间' })
  createTime: Date

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', comment: '更新时间' })
  updateTime: Date
}

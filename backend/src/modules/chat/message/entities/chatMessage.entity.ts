/**
 * chat_message 表
 */
import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm'
import { IsInt, IsObject, IsOptional, IsString } from 'class-validator'

@Entity('chat_message')
export class ChatMessageEntity {
  @PrimaryColumn({ comment: '消息ID' })
  @IsString()
  id: string

  @Column({ comment: '会话ID' })
  @IsString()
  sessionId: string

  @Column({ comment: '角色：1-用户 0-系统' })
  @IsInt()
  sender: number

  @Column({ type: 'longtext', comment: '消息内容' })
  @IsString()
  content: string

  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '创建时间' })
  createTime: Date

  @Column({ comment: '状态 1-正常 0-失效' })
  @IsInt()
  status: number

  @Column({ type: 'simple-json', nullable: true, comment: '拓展字段' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>
}

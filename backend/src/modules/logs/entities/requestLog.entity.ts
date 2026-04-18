import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm'

export type LogSourceType = 'backend' | 'algorithm'

@Entity('request_logs')
@Index(['createTime'])
@Index(['source'])
@Index(['clientApp'])
@Index(['statusCode'])
@Index(['method', 'path'])
@Index(['userId'])
export class RequestLogEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '日志ID(UUID)' })
  id: string

  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '创建时间' })
  createTime: Date

  @Column({ type: 'varchar', length: 32, comment: '日志来源' })
  source: LogSourceType

  @Column({ type: 'varchar', length: 32, name: 'client_app', nullable: true, comment: '客户端来源标识' })
  clientApp?: string | null

  @Column({ type: 'varchar', length: 64, name: 'request_id', nullable: true, comment: '请求ID' })
  requestId?: string | null

  @Column({ type: 'varchar', length: 16, comment: 'HTTP方法' })
  method: string

  @Column({ type: 'varchar', length: 512, comment: '路径' })
  path: string

  @Column({ type: 'varchar', length: 1024, name: 'original_url', comment: '原始URL' })
  originalUrl: string

  @Column({ type: 'int', name: 'status_code', comment: '业务状态码(code)' })
  statusCode: number

  @Column({ type: 'int', name: 'duration_ms', comment: '请求耗时(ms)' })
  durationMs: number

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '客户端IP' })
  ip?: string | null

  @Column({ type: 'text', name: 'user_agent', nullable: true, comment: 'User-Agent' })
  userAgent?: string | null

  @Column({ type: 'text', nullable: true, comment: 'Referer' })
  referer?: string | null

  @Column({ type: 'varchar', length: 64, name: 'user_id', nullable: true, comment: '用户ID' })
  userId?: string | null

  @Column({ type: 'int', name: 'role_id', nullable: true, comment: '角色ID' })
  roleId?: number | null

  @Column({ type: 'longtext', nullable: true, comment: '请求头(JSON字符串)' })
  headers?: string | null

  @Column({ type: 'longtext', nullable: true, comment: 'Query(JSON字符串)' })
  query?: string | null

  @Column({ type: 'longtext', nullable: true, comment: 'Body(JSON字符串)' })
  body?: string | null

  @Column({ type: 'text', name: 'error_message', nullable: true, comment: '错误信息' })
  errorMessage?: string | null

  @Column({ type: 'longtext', name: 'error_stack', nullable: true, comment: '错误堆栈' })
  errorStack?: string | null
}


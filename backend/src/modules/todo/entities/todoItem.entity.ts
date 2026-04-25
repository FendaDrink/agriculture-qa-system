import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('todo_item')
export class TodoItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '主键ID' })
  id: string

  @Column({ type: 'varchar', length: 200, comment: '待办标题' })
  title: string

  @Column({ name: 'due_date', type: 'date', comment: '截止日期' })
  dueDate: string

  @Column({ type: 'tinyint', width: 1, default: 0, comment: '是否完成：1-完成 0-未完成' })
  done: number

  @Column({ name: 'create_by', type: 'varchar', length: 64, comment: '创建人ID' })
  createBy: string

  @Column({ type: 'int', default: 1, comment: '状态：1-有效 0-删除' })
  status: number

  @CreateDateColumn({ name: 'create_time', type: 'datetime', comment: '创建时间' })
  createTime: Date

  @UpdateDateColumn({ name: 'update_time', type: 'datetime', comment: '更新时间' })
  updateTime: Date
}


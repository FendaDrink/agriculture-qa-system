import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('faq_item')
export class FaqItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '主键ID' })
  id: string

  @Column({ type: 'varchar', length: 500, comment: '问题内容' })
  question: string

  @Column({ name: 'origin_question', type: 'varchar', length: 500, nullable: true, comment: '来源自动问题（用于覆盖高频问题）' })
  originQuestion?: string | null

  @Column({ type: 'int', default: 1, comment: '状态：1-启用 0-禁用' })
  status: number

  @Column({ name: 'sort_no', type: 'int', default: 0, comment: '排序，越大越靠前' })
  sortNo: number

  @Column({ name: 'create_by', type: 'varchar', length: 64, nullable: true, comment: '创建人' })
  createBy?: string | null

  @Column({ name: 'update_by', type: 'varchar', length: 64, nullable: true, comment: '更新人' })
  updateBy?: string | null

  @CreateDateColumn({ name: 'create_time', type: 'datetime', comment: '创建时间' })
  createTime: Date

  @UpdateDateColumn({ name: 'update_time', type: 'datetime', comment: '更新时间' })
  updateTime: Date
}

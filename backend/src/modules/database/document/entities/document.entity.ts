/**
 * documents 表
 */
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { IsDate, IsString } from 'class-validator'

@Entity('documents')
export class DocumentEntity {
  @PrimaryColumn({ comment: '文档ID' })
  @IsString()
  id: string

  @Column({ name: 'file_name', comment: '文档名称' })
  @IsString()
  fileName: string

  @Column({ name: 'collection_id', comment: '所属知识库ID' })
  @IsString()
  collectionId: string

  @Column({ name: 'create_by', comment: '创建人ID' })
  @IsString()
  createBy: string

  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '创建时间' })
  createTime: Date

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', comment: '更新时间' })
  updateTime: Date
}

/**
 * collections 表
 */
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { IsDate, IsString } from 'class-validator'

@Entity('collections')
export class CollectionEntity {
  @PrimaryColumn({ comment: '知识库ID' })
  @IsString()
  id: string

  @Column({ name: 'collection_name', comment: '知识库名称' })
  @IsString()
  collectionName: string

  @Column({ comment: '所属城市', default: '湖北省' })
  @IsString()
  city: string

  @Column({ name: 'create_by', comment: '创建人ID' })
  @IsString()
  createBy: string

  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '创建时间' })
  createTime: Date

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', comment: '修改时间' })
  @IsDate()
  updateTime: Date
}

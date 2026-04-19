import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, Like, Repository } from 'typeorm'
import { DocumentEntity } from '../document/entities/document.entity'
import { CollectionEntity } from '../entities/collection.entity'
import { CollectionDto } from '../dto/collection.dto'
import { SearchCollectionDto } from '../dto/searchCollection.dto'
import { createCollectionDto } from '../dto/createCollection.dto'
import { UpdateCollectionDto } from '../dto/updateCollection.dto'

@Injectable()
export class CollectionDAO {
  constructor(
    @InjectRepository(CollectionEntity, 'rag')
    private collectionRepository: Repository<CollectionEntity>, // 注入 collectionRepository
    @InjectRepository(DocumentEntity, 'rag')
    private documentRepository: Repository<DocumentEntity>, // 注入 documentRepository
  ) {}

  /**
   * 查找所有向量库
   */
  async findAllCollections(): Promise<CollectionDto[]> {
    return this.collectionRepository.find()
  }

  /**
   * 根据条件筛选向量库
   * @param searchCollectionDto
   */
  async findCollectionByConditions(
    searchCollectionDto: SearchCollectionDto,
  ): Promise<CollectionDto[]> {
    const {
      id,
      createBy,
      city,
      collectionName,
      createTimeStart,
      createTimeEnd,
      updateTimeStart,
      updateTimeEnd,
    } = searchCollectionDto

    const where: Record<string, any> = {}

    if (id) {
      where.id = id
    }

    if (collectionName) {
      where.collectionName = Like(`%${collectionName}%`)
    }

    if (createBy) {
      where.createBy = Like(`%${createBy}%`)
    }

    if (city) {
      where.city = city
    }

    if (createTimeStart && createTimeEnd) {
      where.createTime = Between(createTimeStart, createTimeEnd)
    } else if (createTimeStart) {
      where.createTime = Between(createTimeStart, new Date())
    }

    if (updateTimeStart && updateTimeEnd) {
      where.updateTime = Between(updateTimeStart, updateTimeEnd)
    } else if (updateTimeStart) {
      where.updateTime = Between(updateTimeStart, new Date())
    }

    return this.collectionRepository.find({ where })
  }

  /**
   * 创建新的 Collection 记录
   */
  async createCollection(collectionDto: createCollectionDto, manager: EntityManager) {
    const collectionEntity = manager.create(CollectionEntity, collectionDto)
    return manager.save(collectionEntity) //保存至数据库中
  }

  /**
   * 更新指定CollectionId的文件
   * @param collectionDto
   * @param manager
   */
  async updateCollection(
    collectionDto: UpdateCollectionDto,
    manager: EntityManager,
  ): Promise<CollectionDto> {
    const collection = await manager.preload(CollectionEntity, collectionDto) // 更新向量库
    return manager.save(collection as CollectionDto)
  }

  /**
   * 根据指定 CollectionID 删除向量库
   * @param id
   * @param manager
   */
  async deleteCollection(id: string, manager: EntityManager): Promise<void> {
    // 1. 删除 collections 表中的记录
    await manager.delete(CollectionEntity, id)

    // 2. 删除 documents 表中的记录
    // 2.1 检索 documents 表中 collection_id 为 id 的记录
    const fileHashList = await this.documentRepository.find({
      where: { collectionId: id },
    })
    // 2.2 将 documents 表中 collection
    await manager.delete(DocumentEntity, { collectionId: id })

    const documentIds = fileHashList.map((entity) => entity.id)

    // 3. 将 rag 库中 fileHashList 中的表逐一删除
    const deleteDocumentPromises = documentIds.map((id) =>
      manager.query(`DROP TABLE IF EXISTS \`${id}\``),
    )
    console.log(deleteDocumentPromises)
    await Promise.all(deleteDocumentPromises)
  }

  toCollectionDto(collection: CollectionEntity): CollectionDto {
    return {
      ...collection,
    }
  }
}

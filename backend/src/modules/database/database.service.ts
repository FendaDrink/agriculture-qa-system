import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DocumentDAO } from './document/dao/document.dao'
import { CollectionDto } from './dto/collection.dto'
import { CollectionDAO } from './dao/collection.dao'
import { SearchCollectionDto } from './dto/searchCollection.dto'
import { createCollectionDto } from './dto/createCollection.dto'
import { v4 as uuidV4 } from 'uuid'
import { UpdateCollectionDto } from './dto/updateCollection.dto'
import { ExternalApiService } from '../../common/api/externalApi.service'

@Injectable()
export class DatabaseService {
  constructor(
    @Inject('rag')
    private readonly dataSource: DataSource,
    private documentDAO: DocumentDAO, // 注入 documentDAO
    private collectionDAO: CollectionDAO, // 注入 CollectionDAO
    private externalApiService: ExternalApiService, // 注入 ExternalApiService
  ) {}

  // ---- 向量库相关 ----
  /**
   * 获取所有向量库
   */
  async findAllCollections(): Promise<CollectionDto[]> {
    return this.collectionDAO.findAllCollections()
  }

  /**
   * 获取符合条件的向量库
   */
  async findCollectionsByCondition(collectionData: SearchCollectionDto): Promise<CollectionDto[]> {
    return this.collectionDAO.findCollectionByConditions(collectionData)
  }

  /**
   * 创建向量库
   */
  async createCollection(createCollectionData: createCollectionDto): Promise<CollectionDto> {
    return this.dataSource.transaction(async (manager) => {
      const collection = {
        ...createCollectionData,
        id: `${uuidV4().slice(0, 8)}_${createCollectionData.collectionName}`,
      }
      const createdCollection = await this.collectionDAO.createCollection(collection, manager)

      return this.collectionDAO.toCollectionDto(createdCollection)
    })
  }

  /**
   * 更新向量库信息
   */
  async updateCollection(collectionData: UpdateCollectionDto): Promise<CollectionDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验向量库是否存在
      const col = await this.collectionDAO.findCollectionByConditions({
        id: collectionData.id,
      })
      if (!col || !col.length) {
        throw new HttpException('该向量库不存在', HttpStatus.NOT_FOUND)
      }

      // 2. 更新向量库信息
      const newCollectionData = {
        ...collectionData,
      }
      const collection = await this.collectionDAO.updateCollection(newCollectionData, manager)

      return this.collectionDAO.toCollectionDto(collection)
    })
  }

  /**
   * 删除向量库
   */
  async deleteCollection(id: string): Promise<any> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验向量库是否存在
      const col = await this.collectionDAO.findCollectionByConditions({
        id,
      })
      if (!col || !col.length) {
        throw new HttpException('该向量库不存在', HttpStatus.NOT_FOUND)
      }

      // 2. 删除向量库
      try {
        await this.collectionDAO.deleteCollection(id, manager)
        await this.externalApiService.deleteCollection(id)
      } catch (err) {
        throw new HttpException('删除失败，请稍后再试', HttpStatus.NOT_IMPLEMENTED)
      }
    })
  }
}

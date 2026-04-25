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
import { RecallDto } from './dto/recall.dto'
import { cityNameToCode, HubeiCityCode } from '../../common/constants/city'

interface RequestUser {
  userId: string
  roleId: number
  city?: string | number
}

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
  async findAllCollections(user: RequestUser): Promise<CollectionDto[]> {
    const userCityCode = cityNameToCode(user.city, HubeiCityCode.HUBEI_PROVINCE)
    if (user.roleId === 0) return this.collectionDAO.findAllCollections()
    if (user.roleId === 1) {
      return this.collectionDAO.findCollectionByConditions({ city: userCityCode })
    }
    return this.collectionDAO.findCollectionByConditions({ createBy: user.userId })
  }

  /**
   * 获取符合条件的向量库
   */
  async findCollectionsByCondition(user: RequestUser, collectionData: SearchCollectionDto): Promise<CollectionDto[]> {
    const userCityCode = cityNameToCode(user.city, HubeiCityCode.HUBEI_PROVINCE)
    const scoped = { ...collectionData }
    if (user.roleId === 1) {
      scoped.city = userCityCode
    }
    if (user.roleId === 2) {
      scoped.createBy = user.userId
    }
    return this.collectionDAO.findCollectionByConditions(scoped)
  }

  /**
   * 创建向量库
   */
  async createCollection(user: RequestUser, createCollectionData: createCollectionDto): Promise<CollectionDto> {
    if (user.roleId !== 0 && user.roleId !== 1) {
      throw new HttpException('无权限创建向量库', HttpStatus.FORBIDDEN)
    }
    const userCityCode = cityNameToCode(user.city, HubeiCityCode.HUBEI_PROVINCE)
    const city = user.roleId === 0
      ? (createCollectionData.city ?? userCityCode)
      : userCityCode
    return this.dataSource.transaction(async (manager) => {
      const collection = {
        ...createCollectionData,
        city,
        createBy: user.userId,
        // Keep collection id ASCII-only to satisfy downstream vector DB name constraints.
        id: `kb_${uuidV4().replace(/-/g, '').slice(0, 20)}`,
      }
      const createdCollection = await this.collectionDAO.createCollection(collection, manager)

      return this.collectionDAO.toCollectionDto(createdCollection)
    })
  }

  /**
   * 更新向量库信息
   */
  async updateCollection(user: RequestUser, collectionData: UpdateCollectionDto): Promise<CollectionDto> {
    if (user.roleId !== 0 && user.roleId !== 1) {
      throw new HttpException('无权限修改向量库', HttpStatus.FORBIDDEN)
    }
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验向量库是否存在
      const col = await this.collectionDAO.findCollectionByConditions({
        id: collectionData.id,
      })
      if (!col || !col.length) {
        throw new HttpException('该向量库不存在', HttpStatus.NOT_FOUND)
      }
      const userCityCode = cityNameToCode(user.city, HubeiCityCode.HUBEI_PROVINCE)
      if (user.roleId === 1 && col[0].city !== userCityCode) {
        throw new HttpException('无权限修改其他城市向量库', HttpStatus.FORBIDDEN)
      }

      // 2. 更新向量库信息
      const newCollectionData = {
        ...collectionData,
        createBy: col[0].createBy,
        city: user.roleId === 0 ? (collectionData.city ?? col[0].city) : col[0].city,
      }
      const collection = await this.collectionDAO.updateCollection(newCollectionData, manager)

      return this.collectionDAO.toCollectionDto(collection)
    })
  }

  /**
   * 删除向量库
   */
  async deleteCollection(user: RequestUser, id: string): Promise<any> {
    if (user.roleId !== 0 && user.roleId !== 1) {
      throw new HttpException('无权限删除向量库', HttpStatus.FORBIDDEN)
    }
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验向量库是否存在
      const col = await this.collectionDAO.findCollectionByConditions({
        id,
      })
      if (!col || !col.length) {
        throw new HttpException('该向量库不存在', HttpStatus.NOT_FOUND)
      }
      const userCityCode = cityNameToCode(user.city, HubeiCityCode.HUBEI_PROVINCE)
      if (user.roleId === 1 && col[0].city !== userCityCode) {
        throw new HttpException('无权限删除其他城市向量库', HttpStatus.FORBIDDEN)
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

  /**
   * 召回分段
   */
  async recallChunks(user: { userId: string; roleId: number }, payload: RecallDto): Promise<any> {
    const collections = await this.collectionDAO.findCollectionByConditions({
      id: payload.collectionId,
    })
    if (!collections || !collections.length) {
      throw new HttpException('该向量库不存在', HttpStatus.NOT_FOUND)
    }

    if (user.roleId === 2 && collections[0].createBy !== user.userId) {
      throw new HttpException('无权限访问该向量库', HttpStatus.FORBIDDEN)
    }

    return this.externalApiService.recall(payload)
  }
}

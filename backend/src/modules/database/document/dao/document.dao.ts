import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, Like, Repository } from 'typeorm'
import { DocumentEntity } from '../entities/document.entity'
import { DocumentDto } from '../dto/document.dto'
import { SearchDocDto } from '../dto/searchDoc.dto'
import { UpdateDocDto } from '../dto/updateDocDto.dto'

@Injectable()
export class DocumentDAO {
  constructor(
    @InjectRepository(DocumentEntity, 'rag')
    private documentRepository: Repository<DocumentEntity>, // 注入 Repository
  ) {}

  /**
   * 查找所有文件
   */
  async findAllDocument(): Promise<DocumentDto[]> {
    return this.documentRepository.find()
  }

  /**
   * 根据条件筛选文件
   * @param searchDocDto
   */
  async findDocumentByConditions(searchDocDto: SearchDocDto): Promise<DocumentDto[]> {
    const {
      id,
      fileName,
      collectionId,
      createBy,
      createTimeStart,
      createTimeEnd,
      updateTimeStart,
      updateTimeEnd,
    } = searchDocDto

    const where: Record<string, any> = {}

    if (id) where.id = id
    if (fileName) where.fileName = Like(`%${fileName}%`)
    if (collectionId) where.collectionId = collectionId
    if (createBy) where.createBy = Like(`%${createBy}%`)

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

    return this.documentRepository.find({ where })
  }

  /**
   * 更新指定DocID的文件
   * @param documentDto
   * @param manager
   */
  async updateDocument(documentDto: UpdateDocDto, manager: EntityManager): Promise<DocumentDto> {
    const newDocumentDto = {
      ...documentDto,
      fileName: documentDto.fileName,
      createBy: documentDto.createBy,
    }
    const document = await manager.preload(DocumentEntity, newDocumentDto) // 更新文件
    return manager.save(document as DocumentDto)
  }

  /**
   * 根据指定DocID删除文件
   * @param id
   * @param manager
   */
  async deleteDocument(id: string, manager: EntityManager): Promise<void> {
    // 1. 删除对应的文档记录
    await manager.delete(DocumentEntity, id)

    // 2. 删除该文档ID表
    await manager.query(`DROP TABLE IF EXISTS \`${id}\``)
  }

  toDocumentDto(document: DocumentEntity): DocumentDto {
    return {
      ...document,
    }
  }
}

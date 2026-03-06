import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DocumentDAO } from './dao/document.dao'
import { DocumentDto } from './dto/document.dto'
import { SearchDocDto } from './dto/searchDoc.dto'
import { UpdateDocDto } from './dto/updateDocDto.dto'
import { ExternalApiService } from '../../../common/api/externalApi.service'
import { UploadDocDto } from './dto/uploadDocDto.dto'

@Injectable()
export class DocumentService {
  constructor(
    @Inject('rag')
    private readonly dataSource: DataSource,
    private documentDAO: DocumentDAO, // 注入 UserDAO
    private externalApiService: ExternalApiService, // 注入 ExternalApiService
  ) {}
  /**
   * 获取所有文件
   */
  async findAllDocs(): Promise<DocumentDto[]> {
    return this.documentDAO.findAllDocument()
  }

  /**
   * 获取符合条件的文件
   */
  async findDocsByCondition(documentData: SearchDocDto): Promise<DocumentDto[]> {
    return this.documentDAO.findDocumentByConditions(documentData)
  }

  /**
   * 上传文件
   */
  async uploadDoc(documentData: UploadDocDto, file: Express.Multer.File): Promise<any> {
    // 1. 参数校验
    // 1.1 校验文件类型
    if (!['application/pdf'].includes(file.mimetype)) {
      throw new BadRequestException('类型错误，文件必须为PDF')
    }
    // 1.2 校验参数
    if (!documentData.user || !documentData.collectionId) {
      throw new BadRequestException('缺少必要参数')
    }

    // 2. 构建 base 服务接口入参
    const fileName = documentData.fileName ? documentData.fileName : file.filename

    const newDocData = new UploadDocDto()
    newDocData.user = documentData.user
    newDocData.fileName = fileName
    newDocData.collectionId = documentData.collectionId
    try {
      return await this.externalApiService.uploadDoc(newDocData, file)
    } catch (e) {
      throw new HttpException('上传失败，请稍后再试', HttpStatus.NOT_IMPLEMENTED)
    }
  }

  /**
   * 更新文件信息
   */
  async updateDoc(documentData: UpdateDocDto): Promise<DocumentDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验文档是否存在
      const doc = await this.documentDAO.findDocumentByConditions({
        id: documentData.id,
      })
      if (!doc || !doc.length) {
        throw new HttpException('该文档不存在', HttpStatus.NOT_FOUND)
      }
      const newDocumentData = {
        ...documentData,
      }
      // 2. 更新文档信息
      const document = await this.documentDAO.updateDocument(newDocumentData, manager)

      return this.documentDAO.toDocumentDto(document)
    })
  }

  /**
   * 删除指定DocID的文件
   * @parm docId
   */
  async deleteDoc(docId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 校验文档是否存在
      const doc = await this.documentDAO.findDocumentByConditions({
        id: docId,
      })
      if (!doc || !doc.length) {
        throw new HttpException('该文档不存在', HttpStatus.NOT_FOUND)
      }

      // 2. 删除文档中的记录
      try {
        // 删除向量库中对应分段的内容
        await this.externalApiService.deleteDocument(doc[0].collectionId, docId, doc[0].fileHash)
        // 删除 document 表中记录 & 改文件对应的分段key-value表
        await this.documentDAO.deleteDocument(docId, manager)
      } catch (error) {
        throw new HttpException('删除失败，请稍后再试', HttpStatus.NOT_IMPLEMENTED)
      }
    })
  }
}

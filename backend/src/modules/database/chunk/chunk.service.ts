import { Inject, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DocumentDAO } from '../document/dao/document.dao'
import { ExternalApiService } from '../../../common/api/externalApi.service'
import { ChunkDetailDto } from './dto/chunkDetail.dto'
import { AddChunkDto } from './dto/addChunk.dto'
import { UpdateChunkDto } from './dto/updateChunk.dto'
import { DeleteChunkDto } from './dto/deleteChunk.dto'

@Injectable()
export class ChunkService {
  constructor(
    @Inject('rag')
    private readonly dataSource: DataSource,
    private readonly documentDAO: DocumentDAO, // 注入 DocumentDAO
    private externalApiService: ExternalApiService, // 注入 ExternalApiService
  ) {}

  /**
   * 获取指定DocId下的所有chunks
   */
  async findAllChunks(documentId: string): Promise<ChunkDetailDto[]> {
    const sql = `SELECT * FROM \`${documentId}\``
    return this.dataSource.manager.query(sql)
  }

  /**
   * 在指定DocId下新增一个chunk
   */
  async uploadChunk(chunk: AddChunkDto): Promise<ChunkDetailDto> {
    return await this.externalApiService.addChunk(chunk)
  }

  /**
   * 在指定DocId下修改某一个chunk
   */
  async updateChunk(chunk: UpdateChunkDto): Promise<ChunkDetailDto> {
    return await this.externalApiService.updateChunk(chunk)
  }

  /**
   * 在指定DocId下删除某一个chunk
   */
  async deleteChunk(chunk: DeleteChunkDto): Promise<void> {
    await this.externalApiService.deleteChunk(chunk)
  }
}

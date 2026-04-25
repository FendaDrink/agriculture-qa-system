import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { DocumentDAO } from '../document/dao/document.dao'
import { ExternalApiService } from '../../../common/api/externalApi.service'
import { ChunkDetailDto } from './dto/chunkDetail.dto'
import { AddChunkDto } from './dto/addChunk.dto'
import { UpdateChunkDto } from './dto/updateChunk.dto'
import { DeleteChunkDto } from './dto/deleteChunk.dto'
import { UserEntity } from '../../user/entities/user.entity'

@Injectable()
export class ChunkService {
  constructor(
    @Inject('rag')
    private readonly dataSource: DataSource,
    private readonly documentDAO: DocumentDAO, // 注入 DocumentDAO
    private externalApiService: ExternalApiService, // 注入 ExternalApiService
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * 获取指定DocId下的所有chunks
   */
  async findAllChunks(documentId: string): Promise<ChunkDetailDto[]> {
    const sql = `SELECT * FROM \`${documentId}\``
    const rows = await this.dataSource.manager.query(sql)
    return this.attachUsernames(rows)
  }

  /**
   * 在指定DocId下新增一个chunk
   */
  async uploadChunk(chunk: AddChunkDto): Promise<ChunkDetailDto> {
    const created = await this.externalApiService.addChunk(chunk)
    const [mapped] = await this.attachUsernames([created])
    return mapped
  }

  /**
   * 在指定DocId下修改某一个chunk
   */
  async updateChunk(chunk: UpdateChunkDto): Promise<ChunkDetailDto> {
    const updated = await this.externalApiService.updateChunk(chunk)
    const [mapped] = await this.attachUsernames([updated])
    return mapped
  }

  /**
   * 在指定DocId下删除某一个chunk
   */
  async deleteChunk(chunk: DeleteChunkDto): Promise<void> {
    await this.externalApiService.deleteChunk(chunk)
  }

  private async attachUsernames(chunks: ChunkDetailDto[]): Promise<ChunkDetailDto[]> {
    const userIds = [
      ...new Set(
        chunks
          .map((item: any) => item?.createBy || item?.create_by)
          .filter(Boolean),
      ),
    ]
    const users = userIds.length
      ? await this.userRepository.find({
          where: { id: In(userIds) },
          select: ['id', 'username'],
        })
      : []
    const usernameMap = new Map(users.map((item) => [item.id, item.username]))
    return chunks.map((item: any) => {
      const createBy = item.createBy || item.create_by
      return {
        ...item,
        createBy,
        username: usernameMap.get(createBy) || createBy,
      }
    })
  }
}

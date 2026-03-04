import {
  Body,
  Controller,
  Delete,
  Get,
  MiddlewareConsumer,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { LogRequestMiddleware } from '../../../app.middleware'
import { AuthGuard } from '../../auth/auth.guard'
import { ChunkDetailDto } from './dto/chunkDetail.dto'
import { ChunkService } from './chunk.service'
import { AddChunkDto } from './dto/addChunk.dto'
import { UpdateChunkDto } from './dto/updateChunk.dto'
import { DeleteChunkDto } from './dto/deleteChunk.dto'

@Controller('database/chunk')
export class ChunkController {
  constructor(private readonly chunkService: ChunkService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(ChunkController)
  }

  /**
   * 根据文档ID查找所有分段
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAllCollections(@Query('documentId') documentId: string): Promise<ChunkDetailDto[]> {
    return this.chunkService.findAllChunks(documentId)
  }

  /**
   * 在指定DocId下新增分段
   */
  @Post()
  @UseGuards(AuthGuard)
  async addChunk(@Body() chunk: AddChunkDto): Promise<ChunkDetailDto> {
    return this.chunkService.uploadChunk(chunk)
  }

  /**
   * 在指定DocId下修改分段
   */
  @Patch()
  @UseGuards(AuthGuard)
  async updateChunk(@Body() chunk: UpdateChunkDto): Promise<ChunkDetailDto> {
    return this.chunkService.updateChunk(chunk)
  }

  /**
   * 在指定DocId下删除分段
   */
  @Delete()
  @UseGuards(AuthGuard)
  async deleteChunk(@Body() chunk: DeleteChunkDto): Promise<void> {
    return this.chunkService.deleteChunk(chunk)
  }
}

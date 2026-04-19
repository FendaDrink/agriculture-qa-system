import {
  Body,
  Controller,
  Delete,
  Get,
  MiddlewareConsumer,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { LogRequestMiddleware } from '../../app.middleware'
import { AuthGuard } from '../auth/auth.guard'
import { DatabaseService } from './database.service'
import { CollectionDto } from './dto/collection.dto'
import { SearchCollectionDto } from './dto/searchCollection.dto'
import { createCollectionDto } from './dto/createCollection.dto'
import { CollectionDAO } from './dao/collection.dao'
import { UpdateCollectionDto } from './dto/updateCollection.dto'
import { RecallDto } from './dto/recall.dto'

@Controller('database')
export class DatabaseController {
  constructor(
    private readonly databaseService: DatabaseService,
    private collectionDAO: CollectionDAO,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(DatabaseController)
  }
  /**
   * 查找所有向量库
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAllCollections(@Req() req: any): Promise<CollectionDto[]> {
    return this.databaseService.findAllCollections(req.user)
  }

  /**
   * 查找指定条件的向量库
   */
  @Get('/search')
  @UseGuards(AuthGuard)
  async findCollectionsByConditions(@Query() data: SearchCollectionDto, @Req() req: any): Promise<CollectionDto[]> {
    return this.databaseService.findCollectionsByCondition(req.user, data)
  }

  /**
   * 创建向量库
   */
  @Post()
  @UseGuards(AuthGuard)
  async createCollection(@Body() data: createCollectionDto, @Req() req: any): Promise<CollectionDto> {
    return this.databaseService.createCollection(req.user, data)
  }

  /**
   * 更新向量库信息
   */
  @Patch()
  @UseGuards(AuthGuard)
  async updateCollection(@Body() data: UpdateCollectionDto, @Req() req: any): Promise<CollectionDto> {
    return this.databaseService.updateCollection(req.user, data)
  }

  /**
   * 删除向量库
   */
  @Delete()
  @UseGuards(AuthGuard)
  async deleteCollection(@Query('collectionId') id: string, @Req() req: any): Promise<void> {
    return this.databaseService.deleteCollection(req.user, id)
  }

  /**
   * 召回分段
   */
  @Post('/recall')
  @UseGuards(AuthGuard)
  async recallChunks(@Body() data: RecallDto, @Req() req: any): Promise<any> {
    return this.databaseService.recallChunks(req.user, data)
  }
}

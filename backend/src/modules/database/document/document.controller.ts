import {
  Body,
  Controller,
  Delete,
  Get,
  MiddlewareConsumer,
  Post,
  Patch,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { DocumentService } from './document.service'
import { LogRequestMiddleware } from '../../../app.middleware'
import { DocumentDto } from './dto/document.dto'
import { AuthGuard } from '../../auth/auth.guard'
import { SearchDocDto } from './dto/searchDoc.dto'
import { UpdateDocDto } from './dto/updateDocDto.dto'
import { UploadDocDto } from './dto/uploadDocDto.dto'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('database/document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(DocumentController)
  }

  /**
   * 查找所有文档
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAllCollections(): Promise<DocumentDto[]> {
    return this.documentService.findAllDocs()
  }

  /**
   * 查找指定条件的文档
   */
  @Get('/search')
  @UseGuards(AuthGuard)
  async findCollectionsByConditions(@Query() data: SearchDocDto): Promise<DocumentDto[]> {
    return this.documentService.findDocsByCondition(data)
  }

  /**
   * 上传文档
   */
  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @Query() data: UploadDocDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    return this.documentService.uploadDoc(data, file)
  }

  /**
   * 更新文档信息
   */
  @Patch()
  @UseGuards(AuthGuard)
  async updateDocument(@Body() data: UpdateDocDto): Promise<DocumentDto> {
    return this.documentService.updateDoc(data)
  }

  /**
   * 删除文档
   */
  @Delete()
  @UseGuards(AuthGuard)
  async deleteDocument(@Query('id') id: string): Promise<void> {
    return this.documentService.deleteDoc(id)
  }
}

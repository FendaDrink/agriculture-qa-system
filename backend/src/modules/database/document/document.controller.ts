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
  Res,
} from '@nestjs/common'
import { DocumentService } from './document.service'
import { LogRequestMiddleware } from '../../../app.middleware'
import { DocumentDto } from './dto/document.dto'
import { AuthGuard } from '../../auth/auth.guard'
import { SearchDocDto } from './dto/searchDoc.dto'
import { UpdateDocDto } from './dto/updateDocDto.dto'
import { UploadDocDto } from './dto/uploadDocDto.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'

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
   * 上传前分段预览
   */
  @Post('/preview-chunks')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async previewChunks(
    @Query() data: UploadDocDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    return this.documentService.previewDocChunks(data, file)
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

  /**
   * 预览/下载源 PDF 文件
   * 注意：此接口返回二进制流，不走统一 JSON 包装
   */
  @Get('/file')
  @UseGuards(AuthGuard)
  async getDocumentFile(@Query('id') id: string, @Res() res: Response): Promise<void> {
    const { stream, fileName, contentType, contentLength } =
      await this.documentService.getDocumentFileStream(id)

    const originalName = (fileName || 'document.pdf').toString()
    // `filename="..."` must be ASCII for Node's header validation; use RFC 5987 `filename*` for UTF-8.
    let asciiFallback = originalName
      .replace(/["\\\r\n]/g, '_')
      .replace(/[^\x20-\x7E]/g, '_')
      .trim()
    if (!asciiFallback) asciiFallback = 'document.pdf'
    if (!asciiFallback.toLowerCase().endsWith('.pdf')) asciiFallback = `${asciiFallback}.pdf`
    const encoded = encodeURIComponent(originalName)

    res.setHeader('Content-Type', contentType || 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
    )
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'no-store')
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }

    stream.pipe(res)
  }
}

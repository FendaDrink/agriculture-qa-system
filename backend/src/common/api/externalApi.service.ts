import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { UploadDocDto } from '../../modules/database/document/dto/uploadDocDto.dto'
import FormData from 'form-data'
import { AddChunkDto } from '../../modules/database/chunk/dto/addChunk.dto'
import { ChunkDetailDto } from '../../modules/database/chunk/dto/chunkDetail.dto'
import { UpdateChunkDto } from '../../modules/database/chunk/dto/updateChunk.dto'
import { DeleteChunkDto } from '../../modules/database/chunk/dto/deleteChunk.dto'
import { SpeechResDto } from '../../modules/chat/dto/speechRes.dto'
import { CompletionDto } from '../../modules/chat/dto/completion.dto'
import { RecallDto } from '../../modules/database/dto/recall.dto'
import type { AxiosResponse } from 'axios'

@Injectable()
export class ExternalApiService {
  constructor(private readonly httpService: HttpService) {}

  // Base 服务健康检查接口
  async health() {
    const url = '/health' // 拼接最终路径
    const response = await lastValueFrom(this.httpService.get(url))
    return response.data
  }

  // Base 服务上传文档接口
  async uploadDoc(documentData: UploadDocDto, file: Express.Multer.File) {
    const url = '/upload'
    const formData = new FormData()

    formData.append('user', documentData.user)
    formData.append('collection_id', documentData.collectionId)
    if (documentData.fileName) {
      formData.append('file_name', documentData.fileName)
    }

    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    })
    const headers = {
      ...formData.getHeaders(),
      'X-Client-App': 'backend',
    }

    const response = await lastValueFrom(this.httpService.post(url, formData, { headers }))
    return response.data
  }

  // Base 服务删除向量库接口
  async deleteCollection(collectionId: string) {
    const url = '/delete_collection'
    const response = await lastValueFrom(
      this.httpService.post(
        url,
        {},
        {
          params: {
            collection_id: collectionId,
          },
          headers: {
            'X-Client-App': 'backend',
          },
        },
      ),
    )
    return response.data
  }

  // Base 服务删除文档接口
  async deleteDocument(collectionId: string, documentId: string, fileHash: string) {
    const url = '/delete_document'
    const response = await lastValueFrom(
      this.httpService.post(
        url,
        {},
        {
          params: {
            collection_id: collectionId,
            document_id: documentId,
            file_hash: fileHash,
          },
          headers: {
            'X-Client-App': 'backend',
          },
        },
      ),
    )
    return response.data
  }

  // Base 服务新增分段接口
  async addChunk(chunk: AddChunkDto): Promise<ChunkDetailDto> {
    const url = '/add_chunk'
    const response = await lastValueFrom(
      this.httpService.post(
        url,
        {
          content: chunk.content,
          collection_id: chunk.collectionId,
          document_id: chunk.documentId,
          user: chunk.user,
        },
        {
          headers: {
            'X-Client-App': 'backend',
          },
        },
      ),
    )
    return response.data
  }

  // Base 服务修改分段接口
  async updateChunk(chunk: UpdateChunkDto): Promise<ChunkDetailDto> {
    const url = '/update_chunk'
    const response = await lastValueFrom(
      this.httpService.post(
        url,
        {
          id: chunk.id,
          content: chunk.content,
          collection_id: chunk.collectionId,
          user: chunk.user,
          document_id: chunk.documentId,
        },
        {
          headers: {
            'X-Client-App': 'backend',
          },
        },
      ),
    )
    return response.data
  }

  // Base 服务删除分段接口
  async deleteChunk(chunk: DeleteChunkDto): Promise<void> {
    const url = '/delete_chunk'
    await lastValueFrom(
      this.httpService.post(
        url,
        {
          id: chunk.id,
          collection_id: chunk.collectionId,
          document_id: chunk.documentId,
        },
        {
          headers: {
            'X-Client-App': 'backend',
          },
        },
      ),
    )
  }

  // Base 服务语音识别
  async speechRecognize(file: Express.Multer.File, model: string): Promise<SpeechResDto> {
    const url = '/speech'
    const formData = new FormData()
    formData.append('model', model)
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    })
    const headers = {
      ...formData.getHeaders(),
      'X-Client-App': 'backend',
    }

    const response = await lastValueFrom(this.httpService.post(url, formData, { headers }))
    return response.data
  }

  // Base 服务聊天
  async completion(completionData: CompletionDto): Promise<any> {
    const url = '/completion'
    const { query, model, collectionId: collection_id, history: chat_history } = completionData
    const response = await this.httpService.axiosRef.post(
      url,
      {
        query,
        model,
        collection_id,
        chat_history,
      },
      {
        responseType: 'stream',
        headers: {
          'X-Client-App': 'backend',
        },
      },
    )
    return response.data
  }

  // Base 服务召回分段
  async recall(recallData: RecallDto): Promise<any> {
    const url = '/recall'
    const response = await lastValueFrom(
      this.httpService.post(
        url,
        {
          query: recallData.query,
          collection_id: recallData.collectionId,
          top_n: recallData.topN ?? 10,
        },
        {
          headers: {
            'X-Client-App': 'backend',
          },
        },
      ),
    )
    return response.data
  }

  // Base 服务下载文档（PDF）接口：返回可读流
  async downloadDocument(collectionId: string, fileHash: string): Promise<AxiosResponse<any>> {
    const url = '/download_document'
    return this.httpService.axiosRef.get(url, {
      params: {
        collection_id: collectionId,
        file_hash: fileHash,
      },
      responseType: 'stream',
      headers: {
        'X-Client-App': 'backend',
      },
    })
  }
}

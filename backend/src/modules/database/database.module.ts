import { Module } from '@nestjs/common'
import { DatabaseService } from './database.service'
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm'
import { DatabaseController } from './databse.controller'
import { DocumentEntity } from './document/entities/document.entity'
import { CollectionDAO } from './dao/collection.dao'
import { CollectionEntity } from './entities/collection.entity'
import { DocumentModule } from './document/document.module'
import { DocumentDAO } from './document/dao/document.dao'
import { DataSource } from 'typeorm'
import { ExternalApiService } from '../../common/api/externalApi.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ChunkModule } from './chunk/chunk.module'

const RagDataSource = getDataSourceToken('rag')

@Module({
  providers: [
    DatabaseService,
    ExternalApiService,
    CollectionDAO,
    DocumentDAO,
    {
      provide: 'rag',
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [RagDataSource],
    },
  ],
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>('BASE_URL'),
        timeout: configService.get('HTTP_TIMEOUT'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    TypeOrmModule.forFeature([CollectionEntity, DocumentEntity], 'rag'),
    DocumentModule,
    ChunkModule,
  ],
  controllers: [DatabaseController],
})
export class DatabaseModule {}

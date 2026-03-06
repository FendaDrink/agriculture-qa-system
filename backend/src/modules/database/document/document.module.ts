import { Module } from '@nestjs/common'
import { DocumentService } from './document.service'
import { DocumentController } from './document.controller'
import { DocumentDAO } from './dao/document.dao'
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm'
import { DocumentEntity } from './entities/document.entity'
import { CollectionEntity } from '../entities/collection.entity'
import { AuthModule } from '../../auth/auth.module'
import { DataSource } from 'typeorm'
import { ExternalApiService } from '../../../common/api/externalApi.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'

const RagDataSource = getDataSourceToken('rag')

@Module({
  providers: [
    ExternalApiService,
    DocumentService,
    DocumentDAO,
    {
      provide: 'rag',
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [RagDataSource],
    },
  ],
  controllers: [DocumentController],
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>('BASE_URL'),
        timeout: configService.get('HTTP_TIMEOUT'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([DocumentEntity, CollectionEntity], 'rag'),
    AuthModule,
  ],
  exports: [AuthModule],
})
export class DocumentModule {}

import { Module } from '@nestjs/common'
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../../auth/auth.module'
import { DataSource } from 'typeorm'
import { ExternalApiService } from '../../../common/api/externalApi.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ChunkController } from './chunk.controller'
import { ChunkService } from './chunk.service'
import { DocumentEntity } from '../document/entities/document.entity'
import { DocumentDAO } from '../document/dao/document.dao'
import { UserEntity } from '../../user/entities/user.entity'

const RagDataSource = getDataSourceToken('rag')

@Module({
  providers: [
    ExternalApiService,
    ChunkService,
    DocumentDAO,
    {
      provide: 'rag',
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [RagDataSource],
    },
  ],
  controllers: [ChunkController],
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>('BASE_URL'),
        timeout: configService.get('HTTP_TIMEOUT'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([DocumentEntity], 'rag'),
    TypeOrmModule.forFeature([UserEntity]),
    AuthModule,
  ],
  exports: [AuthModule],
})
export class ChunkModule {}

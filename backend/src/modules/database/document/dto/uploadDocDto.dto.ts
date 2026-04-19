import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UploadDocDto {
  @IsString()
  @IsNotEmpty()
  user: string

  @IsString()
  @IsNotEmpty()
  collectionId: string

  @IsString()
  @IsOptional()
  fileName?: string

  @IsString()
  @IsOptional()
  chunkRule?: string

  @IsInt()
  @Min(100)
  @IsOptional()
  @Type(() => Number)
  chunkSize?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  chunkOverlap?: number

  @IsInt()
  @Min(20)
  @IsOptional()
  @Type(() => Number)
  minChunkSize?: number
}

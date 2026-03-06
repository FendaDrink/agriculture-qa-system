import { IsDate, IsOptional, IsString } from 'class-validator'

export class SearchCollectionDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsOptional()
  @IsString()
  collectionName?: string

  @IsOptional()
  @IsString()
  createBy?: string

  @IsOptional()
  @IsDate()
  createTimeStart?: Date

  @IsOptional()
  @IsDate()
  createTimeEnd?: Date

  @IsDate()
  @IsOptional()
  updateTimeStart?: Date

  @IsOptional()
  @IsDate()
  updateTimeEnd?: Date
}

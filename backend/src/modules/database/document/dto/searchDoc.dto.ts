import { IsDate, IsOptional, IsString } from 'class-validator'

export class SearchDocDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsOptional()
  @IsString()
  fileName?: string

  @IsOptional()
  @IsString()
  collectionId?: string

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

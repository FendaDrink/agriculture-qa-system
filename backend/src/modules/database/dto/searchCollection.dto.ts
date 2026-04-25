import { Transform, Type } from 'class-transformer'
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator'
import { cityNameToCode, HubeiCityCode } from '../../../common/constants/city'

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

  @Transform(({ value }) => value === undefined || value === '' ? undefined : cityNameToCode(value, HubeiCityCode.HUBEI_PROVINCE))
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  city?: number

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

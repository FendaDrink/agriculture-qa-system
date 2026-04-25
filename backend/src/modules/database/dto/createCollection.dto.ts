import { Transform, Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { cityNameToCode, HubeiCityCode } from '../../../common/constants/city'

export class createCollectionDto {
  @IsNotEmpty()
  @IsString()
  collectionName: string

  @IsNotEmpty()
  @IsString()
  createBy: string

  @Transform(({ value }) => cityNameToCode(value, HubeiCityCode.HUBEI_PROVINCE))
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  city?: number
}

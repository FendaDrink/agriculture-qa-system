import { IsDate, IsNotEmpty, IsString } from 'class-validator'

export class CollectionDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  collectionName: string

  @IsString()
  @IsNotEmpty()
  createBy: string

  @IsDate()
  @IsNotEmpty()
  createTime: Date

  @IsDate()
  @IsNotEmpty()
  updateTime: Date
}

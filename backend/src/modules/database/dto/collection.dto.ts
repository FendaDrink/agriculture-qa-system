import { IsDate, IsInt, IsNotEmpty, IsString } from 'class-validator'

export class CollectionDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  collectionName: string

  @IsInt()
  @IsNotEmpty()
  city: number

  @IsString()
  @IsNotEmpty()
  createBy: string

  @IsString()
  username?: string

  @IsDate()
  @IsNotEmpty()
  createTime: Date

  @IsDate()
  @IsNotEmpty()
  updateTime: Date
}

import { IsDate, IsNotEmpty, IsString } from 'class-validator'

export class DocumentDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  fileName: string

  @IsString()
  @IsNotEmpty()
  fileHash: string

  @IsString()
  @IsNotEmpty()
  collectionId: string

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

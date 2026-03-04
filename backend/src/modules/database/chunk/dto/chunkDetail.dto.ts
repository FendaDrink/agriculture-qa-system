import { IsDate, IsNotEmpty, IsString } from 'class-validator'

export class ChunkDetailDto {
  @IsNotEmpty()
  @IsString()
  id: string

  @IsNotEmpty()
  @IsString()
  content: string

  @IsNotEmpty()
  @IsString()
  createBy: string

  @IsNotEmpty()
  @IsDate()
  createTime: Date

  @IsNotEmpty()
  @IsDate()
  updateTime: Date
}
